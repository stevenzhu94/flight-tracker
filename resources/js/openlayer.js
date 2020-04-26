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

    // png icon as an Style Object
    var iconStyle = new ol.style.Style({
        image: new ol.style.Icon(({
            src: '../genre_skies/resources/images/blackplane.png',
            scale: .03,
            rotation: 45
        }))
    });

    
    var features = [];

    callOpenSkyAPIAllStates().then( response => { updateMarkers(response, iconStyle, omap, features); }).then( () => { updateMap(features, omap); });
}

/**
 * This calls the OpenSky API for all states of planes
 * @returns JSON of response
 */
async function callOpenSkyAPIAllStates() {
    let data = await fetch('https://opensky-network.org/api/states/all');
    let response = await data.json();
    return response;
}

/**
 * This updates the location of all markers based on response from API call
 * 
 * @param {Object} response JSON response from API call
 * @param {Object} icon an SVG line projection or png reference 
 * @param {Object} gmap google map
 * @param {Object} markers dict to store markers with the callsign as key
 */
function updateMarkers(response, icon, omap, features) {

    // for each state of plane from response, add or update in markers
    for (var i = 0; i < Object.keys(response.states).length; i++) {
        var callsign = response.states[i][1];

        // check for callsign, ignoring null or empty
        if (callsign != null && callsign != "        ") {
            var longitude = response.states[i][5];
            var latitude = response.states[i][6];
            var onground = response.states[i][8];
            var rotation = response.states[i][10];
            // icon.rotation = rotation;

            // check for key in markers, then update or add
            if (callsign in features) {
                // var marker = markers[callsign];

                // // set new icon rotation
                // var currentIcon = marker.getIcon();
                // currentIcon.rotation = rotation;
                // marker.setIcon(currentIcon);

                // // move marker recursively if marker is currently shown on map or directly destination otherwise
                // var moves = 100;
                // var latDelta = latitude - marker.getPosition().lat();
                // var lngDelta = longitude - marker.getPosition().lng();
                // if (marker.getMap() == null || Math.abs(latDelta) > .35 || Math.abs(lngDelta) > .35 || (Math.abs(latDelta == 0) && Math.abs(lngDelta == 0)))
                //     marker.setPosition(new google.maps.LatLng(latitude, longitude));
                // else
                //     moveMarker(moves, latDelta / moves, lngDelta / moves, marker);
            } else {
                if (onground == false && latitude != null) {
                    var marker = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.transform([longitude, latitude], 'EPSG:4326', 'EPSG:3857'))
                    });

                    // png icon as an Style Object
                    var icon = new ol.style.Style({
                        image: new ol.style.Icon(({
                            src: '../genre_skies/resources/images/blackplane.png',
                            scale: .03,
                            rotation: rotation
                        }))
                    });

                    marker.setStyle(icon);
                    features.push(marker);
                }
            }
        }
    }
    // deleteOldMarkers(response, markers);
    // setMapOnInBoundMarkers(gmap, markers);
}

function updateMap(features, omap) {

    console.log(`feature length:  ${features.length}`);
    

    var markerList = new ol.source.Vector({
        features: features
    });

    var flightsLayer = new ol.layer.Vector({
        className: 'flightsLayer',
        source: markerList
    });

    omap.addLayer(flightsLayer);
}























































// /**
//  * Initializes google map
//  */
// function initMap() {
//     var gmap;
//     gmap = new google.maps.Map(document.getElementById('gmap'), {
//         center: { lat: 30.2672, lng: -97.7431 },
//         zoom: 8,
//         draggable: true
//     });

//     var markers = {};

//     // png plane icons, cannot be rotated
//     var icons = {
//         paperPlane: {
//             icon: {
//                 url: '../genre_skies/resources/images/paperplane.png',
//                 scaledSize: new google.maps.Size(20, 20),
//                 anchor: new google.maps.Point(10, 10)
//             }
//         },
//         whitePlane: {
//             icon: {
//                 url: '../genre_skies/resources/images/whiteplane.png',
//                 scaledSize: new google.maps.Size(20, 20),
//                 anchor: new google.maps.Point(10, 10)
//             }
//         }
//     }

//     // an SVG line projection of a plane, can be rotated
//     var plane = {
//         path: 'M90 20Q80 20 80 35L80 65L30 95L30 105L80 90L85 140L75 150L105 150L95 140L100 90L150 105L150 95L100 65L100 35Q100 20 90 20',
//         fillColor: 'white',
//         fillOpacity: .8,
//         scale: .18,
//         rotation: 45,
//         strokeColor: 'black',
//         strokeWeight: 1,
//         anchor: new google.maps.Point(20, 20)
//     };

//     var useSVG = true;
//     if (useSVG) {
//         callOpenSkyAPIAllStates().then(response => updateMarkers(response, plane, gmap, markers));
//         setInterval(() => {
//             callOpenSkyAPIAllStates().then(response => { updateMarkers(response, plane, gmap, markers); });
//         }, 30000);
//     } else {
//         callOpenSkyAPIAllStates().then(response => updateMarkers(response, icons['whitePlane'].icon, gmap, markers));
//         setInterval(() => {
//             callOpenSkyAPIAllStates().then(response => { updateMarkers(response, icons['whitePlane'].icon, gmap, markers); });
//         }, 30000);
//     }

//     // listener to set markers that are inbounds, remove markers that are not when bounds change
//     gmap.addListener('bounds_changed', function () {
//         setMapOnInBoundMarkers(gmap, markers);
//     });

//     var highlightedMarker = null;
//     // add event listerner to flight search box to trigger searchForFlight()
//     document.getElementById('flight-input').addEventListener('change', function () {
//         highlightedMarker = searchForFlight(this.value, gmap, markers, highlightedMarker);
//     });
// }

// /**
//  * This calls the OpenSky API for all states of planes
//  * @returns JSON of response
//  */
// async function callOpenSkyAPIAllStates() {
//     let data = await fetch('https://opensky-network.org/api/states/all');
//     let response = await data.json();
//     return response;
// }

// /**
//  * This updates the location of all markers based on response from API call
//  * 
//  * @param {Object} response JSON response from API call
//  * @param {Object} icon an SVG line projection or png reference 
//  * @param {Object} gmap google map
//  * @param {Object} markers dict to store markers with the callsign as key
//  */
// function updateMarkers(response, icon, gmap, markers) {

//     // for each state of plane from response, add or update in markers
//     for (var i = 0; i < Object.keys(response.states).length; i++) {
//         var callsign = response.states[i][1];

//         // check for callsign, ignoring null or empty
//         if (callsign != null && callsign != "        ") {
//             var longitude = response.states[i][5];
//             var latitude = response.states[i][6];
//             var onground = response.states[i][8];
//             var rotation = response.states[i][10];
//             icon.rotation = rotation;

//             // check for key in markers, then update or add
//             if (callsign in markers) {
//                 var marker = markers[callsign];

//                 // set new icon rotation
//                 var currentIcon = marker.getIcon();
//                 currentIcon.rotation = rotation;
//                 marker.setIcon(currentIcon);

//                 // move marker recursively if marker is currently shown on map or directly destination otherwise
//                 var moves = 100;
//                 var latDelta = latitude - marker.getPosition().lat();
//                 var lngDelta = longitude - marker.getPosition().lng();
//                 if (marker.getMap() == null || Math.abs(latDelta) > .35 || Math.abs(lngDelta) > .35 || (Math.abs(latDelta == 0) && Math.abs(lngDelta == 0)))
//                     marker.setPosition(new google.maps.LatLng(latitude, longitude));
//                 else
//                     moveMarker(moves, latDelta / moves, lngDelta / moves, marker);
//             } else {
//                 if (onground == false && latitude != null) {
//                     var marker = new google.maps.Marker({
//                         position: new google.maps.LatLng(latitude, longitude),
//                         icon: icon,
//                         title: callsign
//                     });
//                     markers[callsign] = marker;
//                 }
//             }
//         }
//     }
//     deleteOldMarkers(response, markers);
//     setMapOnInBoundMarkers(gmap, markers);
// }

// /**
//  * Loop through response to delete plane from dict of markers, skip if the plane still exist in the response
//  * 
//  * @param {Object} data A JSON object of the response from Open Sky API
//  * @param {Object} markers A dict of the Markers created in updateMarkers(); 
//  */
// function deleteOldMarkers(data, markers) {
//     var length = data.states.length;
//     loop1:
//     for (const key in markers) {
//         var i;
//         for (i = 0; i < length; i++)
//             if (data.states[i][1] == key)
//                 continue loop1;
//         markers[key].setMap(null);
//         delete markers[key];
//     }
// }

// /**
//  * Move marker smoothly by recursively iterating through the change in location in smaller parts
//  * 
//  * @param {int} countdown Number of remaining recursive calls
//  * @param {int} latDelta The change in latitude from marker's current latitude
//  * @param {int} lngDelta The change in longitude from marker's current longitude
//  * @param {Object} marker The marker that is being moved
//  */
// function moveMarker(countdown, latDelta, lngDelta, marker) {
//     marker.setPosition(new google.maps.LatLng(marker.getPosition().lat() + latDelta, marker.getPosition().lng() + lngDelta));
//     // waitTime * original countdown should never be more than time between api calls
//     var waitTime = 290;
//     if (countdown > 0)
//         setTimeout(moveMarker, waitTime, countdown - 1, latDelta, lngDelta, marker);
// }

// /**
//  * Set markers that are in bounds, remove those that are not
//  * 
//  * @param {Object} gmap The google map object
//  * @param {Object} markers The dictionary that holds all the current markers
//  */
// function setMapOnInBoundMarkers(gmap, markers) {
//     var mapCenter = gmap.getBounds();
//     for (const key in markers)
//         if (mapCenter.contains(markers[key].getPosition()))
//             markers[key].setMap(gmap);
//         else
//             markers[key].setMap(null);
// }

// /**
//  * Center map on and highlight new flight
//  * 
//  * @param {string} flightID The flight callsign passed in from input
//  * @param {Object} gmap The google map object
//  * @param {Object} markers The dict of markers currently tracked
//  * @param {Object} highlightedMarker The currently highlighted marker
//  * @returns The highlightedMarker to track
//  */
// function searchForFlight(flightID, gmap, markers, highlightedMarker) {
//     if (highlightedMarker != null) {
//         var icon = highlightedMarker.getIcon();
//         icon.fillColor = 'white';
//         highlightedMarker.setIcon(icon);
//         highlightedMarker = null;
//     }

//     flightID = flightID.toUpperCase();
//     while (flightID.length != 8)
//         flightID += " ";

//     var found = false;
//     for (const key in markers) {
//         if (key == flightID) {
//             found = true;
//             highlightedMarker = markers[key];
//             var icon = highlightedMarker.getIcon();
//             icon.fillColor = 'deepskyblue';
//             highlightedMarker.setIcon(icon);
//             var latlng = highlightedMarker.getPosition();
//             gmap.setCenter(latlng);
//             gmap.setZoom(10);
//             break;
//         }
//     }

//     if (!found && flightID.trim() != "")
//         alert(`${flightID.trim()} could not be found!`);

//     return highlightedMarker;
// }

// /**
//  * Center map on user set location, currently not used due to no billing info on google account :D
//  * 
//  * @param {Object} gmap The google map object
//  */
// function searchForLocation(gmap) {
//     // Create the search box and link it to the UI element.
//     var input = document.getElementById('floating-input');
//     var searchBox = new google.maps.places.SearchBox(input);

//     // Bias the SearchBox results towards current map's viewport.
//     gmap.addListener('bounds_changed', function () {
//         searchBox.setBounds(gmap.getBounds());
//     });
//     // Listen for the event fired when the user selects a prediction and retrieve
//     // more details for that place.
//     searchBox.addListener('places_changed', function () {
//         var places = searchBox.getPlaces();

//         if (places.length == 0) {
//             return;
//         }

//         // For each place, get the name and location.
//         var bounds = new google.maps.LatLngBounds();
//         places.forEach(function (place) {
//             if (!place.geometry)
//                 return;
//             if (place.geometry.viewport)
//                 bounds.union(place.geometry.viewport);
//             else
//                 bounds.extend(place.geometry.location);
//         });
//         gmap.fitBounds(bounds);
//     });
// }