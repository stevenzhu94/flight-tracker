var gmap;
var markers;

function initMap() {
    gmap = new google.maps.Map(document.getElementById('gmap'), {
        center: { lat: 30.2672, lng: -97.7431 },
        zoom: 8,
        draggable: true
    });
    markers = {};

    // png plane icons, cannot be rotated
    var icons = {
        paperPlane: {
            icon: {
                url: '../genre_skies/resources/images/paperplane.png',
                scaledSize: new google.maps.Size(20, 20),
                anchor: new google.maps.Point(10, 10)
            }
        },
        whitePlane: {
            icon: {
                url: '../genre_skies/resources/images/whiteplane.png',
                scaledSize: new google.maps.Size(20, 20),
                anchor: new google.maps.Point(10, 10)
            }
        }
    }

    // an SVG line projection of a plane, can be rotated
    var plane = {
        path: 'M90 20Q80 20 80 35L80 65L30 95L30 105L80 90L85 140L75 150L105 150L95 140L100 90L150 105L150 95L100 65L100 35Q100 20 90 20',
        fillColor: 'white',
        fillOpacity: .8,
        scale: .18,
        rotation: 45,
        strokeColor: 'black',
        strokeWeight: 1,
        anchor: new google.maps.Point(20, 20)
    };

    // draws markers on map with SVG line paths or png file
    var useSVG = true;
    if (useSVG) {
        updateMarkers(plane, gmap, markers);
        setInterval(updateMarkers, 30000, plane, gmap, markers);
    } else {
        updateMarkers(icons['whitePlane'].icon, gmap, markers);
        setInterval(updateMarkers, 30000, icons['whitePlane'].icon, gmap, markers);
    }

    // listener to set markers that are inbounds, and remove markers that are not
    gmap.addListener('bounds_changed', function () {
        setMapOnInBoundMarkers(gmap, markers);
    });
}

// add marker to dictionary
async function updateMarkers(icon, gmap, markers) {
    let data = await fetch('https://opensky-network.org/api/states/all');
    let response = await data.json();

    // for each state of plane from response, add or update in markers
    for (var i = 0; i < Object.keys(response.states).length; i++) {
        var callsign = response.states[i][1];

        // check for callsign, ignoring null or empty
        if (callsign != null && callsign != "        " && callsign != undefined) {
            var longitude = response.states[i][5];
            var latitude = response.states[i][6];
            var onground = response.states[i][8];
            var rotation = response.states[i][10];
            icon.rotation = rotation;

            // check for key in markers, then update or add
            if (callsign in markers) {
                var marker = markers[callsign];

                // set new icon rotation
                var currentIcon = marker.getIcon();
                currentIcon.rotation = rotation;
                marker.setIcon(currentIcon);

                // move marker recursively if marker is currently shown on map or directly destination otherwise
                var moves = 100;
                var latDelta = latitude - marker.getPosition().lat();
                var lngDelta = longitude - marker.getPosition().lng();
                if (marker.getMap() == null || Math.abs(latDelta) > .35 || Math.abs(lngDelta) > .35 || (Math.abs(latDelta == 0) && Math.abs(lngDelta == 0)))
                    marker.setPosition(new google.maps.LatLng(latitude, longitude));
                else
                    moveMarker(moves, latDelta / moves, lngDelta / moves, marker);
            } else {
                if (onground == false && latitude != null) {
                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(latitude, longitude),
                        icon: icon,
                        title: callsign
                    });
                    markers[callsign] = marker;
                }
            }
        }
    }
    deleteOldMarkers(response);
    setMapOnInBoundMarkers(gmap, markers);
}

// loop through response to delete plane from dict of markers, skip if the plane still exitst in the response
function deleteOldMarkers(data) {
    var length = data.states.length;
    loop1:
    for (const key in markers) {
        var i;
        for (i = 0; i < length; i++)
            if (data.states[i][1] == key)
                continue loop1;
        markers[key].setMap(null);
        delete markers[key];
    }
}

// move marker smoothly by dividing the change into smaller parts
function moveMarker(countdown, latDelta, lngDelta, marker) {
    marker.setPosition(new google.maps.LatLng(marker.getPosition().lat() + latDelta, marker.getPosition().lng() + lngDelta));
    // waitTime * original countdown should never be more than time between api calls
    var waitTime = 290;
    if (countdown > 0)
        setTimeout(moveMarker, waitTime, countdown - 1, latDelta, lngDelta, marker);
}

// set markers that are in bounds, remove those that are not
function setMapOnInBoundMarkers(gmap, markers) {
    var mapCenter = gmap.getBounds();
    for (const key in markers)
        if (mapCenter.contains(markers[key].getPosition()))
            markers[key].setMap(gmap);
        else
            markers[key].setMap(null);
}

// set marker to mew position test
function drawMarkerTest() {
    var marker = new google.maps.Marker({
        position: { lat: 30.2672, lng: -97.7431 },
        icon: icons['whitePlane'].icon,
        map: gmap
    });
    marker.setPosition({ lat: 30.7672, lng: -97.2431 });
    marker.setMap(gmap);
}

// center map on flight
function searchForFlight(flightID) {
    flightID = flightID.toUpperCase();

    while (flightID.length != 8) {
        flightID += " ";
    }

    var found = false;
    for (const key in markers) {

        if (key == flightID) {
            found = true;
            var marker = markers[key];
            var latlng = marker.getPosition();
            var icon = marker.getIcon();
            icon.fillColor = 'deepskyblue';
            marker.setIcon(icon);
            gmap.setCenter(latlng);
            gmap.setZoom(10);
        } else {
            var marker = markers[key];
            var icon = marker.getIcon();
            icon.fillColor = 'white';
            marker.setIcon(icon);
        }

    }
    if (!found)
        alert(`${flightID.trim()} could not be found!`);
}

// center map on user set location, currently not used due to no billing info on google account
function searchForLocation(gmap) {
    // Create the search box and link it to the UI element.
    var input = document.getElementById('floating-input');
    var searchBox = new google.maps.places.SearchBox(input);

    // Bias the SearchBox results towards current map's viewport.
    gmap.addListener('bounds_changed', function () {
        searchBox.setBounds(gmap.getBounds());
    });
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function () {
        var places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        // For each place, get the name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function (place) {
            if (!place.geometry)
                return;
            if (place.geometry.viewport)
                bounds.union(place.geometry.viewport);
            else
                bounds.extend(place.geometry.location);
        });
        gmap.fitBounds(bounds);
    });
}