require('dotenv').config({path: __dirname + '/.env'});
const Plane = require(__dirname + '/resources/js/plane');
const MongoDBClient = require(__dirname + '/resources/js/mongo').mongoDbClient;
var dbClient;

/**
 * Initializes the Openlayer map
 */
async function initOpenLayerMap() {
    var omap = new ol.Map({
        target: document.getElementById('omap'),
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([-97.7431, 30.2672]),
            zoom: 5
        })
    });

    var source = new ol.source.Vector();

    callOpenSkyAPIAllStates()
        .then(response => { updateMarkers(omap, response, source); })
        .then(() => { addPlaneLayer(omap, source); })
        .then(() => { removeVeil(); });

    // call the api in 30 second intervals;
    const interval = 30000;
    setInterval(() => {
        callOpenSkyAPIAllStates().then(response => { updateMarkers(omap, response, source); });
    }, interval);

    // add event listener to flight search box to trigger searchForFlight()
    document.getElementById('flight-input').addEventListener('change', function () {
        highlightedMarker = searchForFlight(this.value, omap, source);
    });

    // add event to display descriptive popup on mouseover
    const popup = document.getElementById('popup');
    omap.on('pointermove', function (event) {
        var feature = omap.forEachFeatureAtPixel(event.pixel,
            function (feature) {
                return feature;
            });
        if (feature) {
            popup.style.left = (event.pixel[0]) + 'px';
            popup.style.top = (event.pixel[1] - (popup.offsetHeight+1)) + 'px';
            popup.style.opacity = .8;
            popup.innerText = feature.get('name');
        } else {
            popup.style.opacity = 0;
        }
    });

    // pan to flights on click
    omap.on('click', function (event) {
        var feature = omap.forEachFeatureAtPixel(event.pixel,
            function (feature) {
                return feature;
            });
        omap.getView().animate({
            center: feature.getGeometry().getCoordinates(),
            duration: 2000,
            zoom: 12
        });
    });
}

/**
 * This calls the OpenSky API for all states of planes
 * @returns JSON of response
 */
async function callOpenSkyAPIAllStates(time = null) {
    var data;
    try {
        if (time == null) {
            data = await fetch('https://opensky-network.org/api/states/all');
        } else {
            data = await fetch(`https://opensky-network.org/api/states/all?time=${time}`);
        }
        return await data.json();
    } catch (ex) {
        console.log(`Error caught while fetching data from opensky`, ex);
    }
    
}

/**
 * This updates the location of all markers based on response from API call
 * 
 * @param {Object} omap openlayers map
 * @param {Object} response JSON response from API call
 * @param {Object} source ol.source.Vector object
 */
async function updateMarkers(omap, response, source) {
    // connect to db
    const uri = `mongodb+srv://app_access:${process.env.MONGODB_PW}@cluster0.6ngs7.mongodb.net/flight_tracker?retryWrites=true&w=majority`;
    dbClient = await new MongoDBClient();
    await dbClient.connect({url: uri});
    var cursor = await dbClient.find('planes');
    const allPlanes = await cursor.toArray();

    const extent = omap.getView().calculateExtent(omap.getSize());
    // for each state of plane from response, add or update in markers
    for (var i = 0; i < Object.keys(response.states).length; i++) {
        const callsign = response.states[i][1];
        const icao = response.states[i][0];
        // check for callsign, ignoring null or empty
        if (callsign !== "" && callsign != "00000000") {
            var plane;
            if (plane = allPlanes.find(p => p.icao == icao)) {
                console.log('found icao', icao);
                if (Date.now() - plane.updated > 86,400,000) {
                    plane.updateSong(null);
                }
            } else {
                plane = new Plane(icao, null);
                dbClient.insertOne('planes', plane);
            }

            var longitude = response.states[i][5];
            var latitude = response.states[i][6];
            var onground = response.states[i][8];
            var rotation = response.states[i][10];
            var featureToUpdate = source.getFeatureById(callsign);

            // update if markerToBeUpdated exists in source, otherwise add it
            if (featureToUpdate != null) {
                // set new icon rotation
                featureToUpdate.getStyle().getImage().setRotation(rotation * (Math.PI/180));

                // if marker not currently in view on map or not moving, skip animation and move directly to dest, else animate marker
                var currentCoord = featureToUpdate.getGeometry().getCoordinates();
                currentCoord = ol.proj.transform(currentCoord, 'EPSG:3857', 'EPSG:4326');
                var lngDelta = longitude - currentCoord[0];
                var latDelta = latitude - currentCoord[1];
                let featureInView = ol.extent.containsExtent(extent, featureToUpdate.getGeometry().getExtent());
                if (!featureInView || (latDelta == 0 && lngDelta == 0)) {
                    let newCoord = ol.proj.transform([longitude, latitude], 'EPSG:4326', 'EPSG:3857');
                    featureToUpdate.getGeometry().setCoordinates(newCoord);
                } else {
                    let moves = 100;
                    moveMarker(moves, latDelta / moves, lngDelta / moves, featureToUpdate);
                }
            } else {
                if (onground == false && latitude != null) {
                    var marker = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.transform([longitude, latitude], 'EPSG:4326', 'EPSG:3857')),
                        name: callsign
                    });
                    marker.setId(callsign);
                    marker.title = callsign;

                    // png icon as an Style Object
                    var style = new ol.style.Style({
                        image: new ol.style.Icon(({
                            src: './resources/images/airplane.png',
                            scale: .045,
                            rotation: rotation * (Math.PI/180)
                        }))
                    });

                    marker.setStyle(style);
                    source.addFeature(marker);
                }
            }
        }
    }
    deleteOldMarkers(response, source);

    // update number of planes tracked
    var count = source.getFeatures().length;
    info.innerText = `Flights Tracked: ${count}!`;
}

/**
 * This is called at the end of the first updateMarkers call to add plane layer to the map
 * 
 * @param {Object} omap open layer map
 * @param {Object} source ol.source.Vector object
 */
function addPlaneLayer(omap, source) {
    var planesLayer = new ol.layer.Vector({
        className: 'planesLayer',
        source: source
    });
    omap.addLayer(planesLayer);
}

/**
 * Loop through features to delete feature from source, skip if the plane still exist in the response
 * 
 * @param {Object} response A JSON object of the response from Open Sky API
 * @param {Object} source ol.source.Vector object that holds all the features; 
 */
function deleteOldMarkers(response, source) {
    var features = source.getFeatures();
    for (var i = 0; i < features.length; i++) {
        if (response.states.some(id => id[1] === features[i].getId()))
            continue;    
        source.removeFeature(features[i]);
    }
}

/**
 * Move marker smoothly by recursively iterating through the change in location in smaller parts
 * 
 * @param {int} countdown Number of remaining recursive calls
 * @param {int} latDelta The change in latitude from marker's current latitude
 * @param {int} lngDelta The change in longitude from marker's current longitude
 * @param {Object} feature ol.Feature object representing the marker
 */
function moveMarker(countdown, latDelta, lngDelta, feature) {
    const currentCoord = ol.proj.transform(feature.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326');
    const coord = ol.proj.transform([currentCoord[0] + lngDelta, currentCoord[1] + latDelta], 'EPSG:4326', 'EPSG:3857');
    feature.getGeometry().setCoordinates(coord);
    const waitTime = 300; // waitTime * original countdown should never be more than time between api calls
    if (countdown > 0)
        setTimeout(moveMarker, waitTime, countdown - 1, latDelta, lngDelta, feature);
}

/**
 * Center map on searched flight
 * 
 * @param {string} flightID The flight callsign passed in from input
 * @param {Object} omap Openlayers map object
 * @param {Object} source ol.source.Vector object holding all markers
 */
function searchForFlight(flightID, omap, source) {
    flightID = flightID.toUpperCase();
    while (flightID.length != 8)
        flightID += ' ';

    var found = false;
    var highlightedMarker = source.getFeatureById(flightID);
    if (highlightedMarker != null) {
        found = true;
        var coords = highlightedMarker.getGeometry().getCoordinates();
        omap.getView().animate({
            center: coords,
            duration: 2000,
            zoom: 12
        });
    }

    if (!found && flightID.trim() != "")
        alert(`Flight ${flightID.trim()} could not be found!`);
}

function removeVeil() {
    let veil = document.getElementById('map-veil');
    veil.remove();
}