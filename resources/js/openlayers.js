/**
 * Initializes the Openlayer map
 */
function initOpenLayerMap() {
    var omap = new ol.Map({
        target: document.getElementById('omap'),
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([-97.7431, 30.2672]),
            zoom: 10
        })
    });

    var source = new ol.source.Vector();

    callOpenSkyAPIAllStates().then(response => { updateMarkers(omap, response, source); }).then(() => { addPlaneLayer(omap, source); });
    setInterval(() => {
        callOpenSkyAPIAllStates().then(response => { updateMarkers(omap, response, source); });
    }, 30000);

    // add event listerner to flight search box to trigger searchForFlight()
    document.getElementById('flight-input').addEventListener('change', function () {
        highlightedMarker = searchForFlight(this.value, omap, source);
    });

    // add event to display descriptive popup on mouseover
    var element = document.getElementById('popup');
    omap.on('pointermove', function (event) {
        var feature = omap.forEachFeatureAtPixel(event.pixel,
            function (feature) {
                return feature;
            });
        if (feature) {
            element.style.left = (event.pixel[0]) + 'px';
            element.style.top = (event.pixel[1] - (element.offsetHeight+1)) + 'px';
            element.style.opacity = .8;
            element.innerText = feature.get('name');
        } else {
            element.style.opacity = 0;
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
async function callOpenSkyAPIAllStates() {
    let data = await fetch('https://opensky-network.org/api/states/all');
    return await data.json();
}

/**
 * This updates the location of all markers based on response from API call
 * 
 * @param {Object} omap openlayers map
 * @param {Object} response JSON response from API call
 * @param {Object} source ol.source.Vector object
 */
function updateMarkers(omap, response, source) {
    const extent = omap.getView().calculateExtent(omap.getSize());

    // for each state of plane from response, add or update in markers
    for (var i = 0; i < Object.keys(response.states).length; i++) {
        var callsign = response.states[i][1];

        // check for callsign, ignoring null or empty
        if (callsign != null && callsign != "        ") {
            var longitude = response.states[i][5];
            var latitude = response.states[i][6];
            var onground = response.states[i][8];
            var rotation = response.states[i][10];
            var featureToUpdate = source.getFeatureById(callsign);

            // add if markerToBeUpdated does not exist in source, else update
            if (featureToUpdate != null) {
                // set new icon rotation
                featureToUpdate.getStyle().getImage().setRotation(rotation * (Math.PI/180));

                // move marker recursively if marker is currently shown on map or directly destination otherwise
                var currentCoord = featureToUpdate.getGeometry().getCoordinates();
                currentCoord = ol.proj.transform(currentCoord, 'EPSG:3857', 'EPSG:4326');
                var lngDelta = longitude - currentCoord[0];
                var latDelta = latitude - currentCoord[1];
                let featureInView = ol.extent.containsExtent(extent, featureToUpdate.getGeometry().getExtent());
                if (!featureInView || Math.abs(latDelta) > .5 || Math.abs(lngDelta) > .5 || (Math.abs(latDelta == 0) && Math.abs(lngDelta == 0))) {
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
                            src: '../genre_skies/resources/images/whiteplanewithborder.png',
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
 * Loop through features to delete plane from source, skip if the plane still exist in the response
 * 
 * @param {Object} response A JSON object of the response from Open Sky API
 * @param {Object} source ol.source.Vector object that holds all the features; 
 */
function deleteOldMarkers(response, source) {
    var features = source.getFeatures();
    var featuresLength = features.length;
    var responseLength = response.states.length;
    loop1:
    for (var i = 0; i < featuresLength; i++) {
        var featureId = features[i].getId();
        for (var j = 0; j < responseLength; j++)
            if (response.states[j][1] == featureId)
                continue loop1;
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
    const currentLng = currentCoord[0];
    const currentLat = currentCoord[1];
    const coord = ol.proj.transform([currentLng + lngDelta, currentLat + latDelta], 'EPSG:4326', 'EPSG:3857');
    feature.getGeometry().setCoordinates(coord);
    // waitTime * original countdown should never be more than time between api calls
    var waitTime = 300;
    if (countdown > 0)
        setTimeout(moveMarker, waitTime, countdown - 1, latDelta, lngDelta, feature);
}

// /**
//  * Center map on and highlight new flight
//  * 
//  * @param {string} flightID The flight callsign passed in from input
//  * @param {Object} gmap The google map object
//  * @param {Object} markers The dict of markers currently tracked
//  * @param {Object} highlightedMarker The currently highlighted marker
//  * @returns The highlightedMarker to track
//  */
function searchForFlight(flightID, omap, source) {

    flightID = flightID.toUpperCase();
    while (flightID.length != 8)
        flightID += " ";

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
        alert(`${flightID.trim()} could not be found!`);
}