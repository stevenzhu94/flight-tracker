var gmap;
var markers;

function initMap() {
    gmap = new google.maps.Map(document.getElementById('gmap'), {
        center: { lat: 30.2672, lng: -97.7431 },
        zoom: 8,
        draggable: true
    });

    markers = {};

    // plane icons, cannot be rotated :(
    var icons = {
        paperPlane: {
            icon: {
                url: '../FlightAPI/resources/images/paperplane.png',
                scaledSize: new google.maps.Size(20, 20),
                anchor: new google.maps.Point(10, 10)
            }
        },
        whitePlane: {
            icon: {
                url: '../FlightAPI/resources/images/whiteplane.png',
                scaledSize: new google.maps.Size(20, 20),
                anchor: new google.maps.Point(10, 10)
            }
        } 
    }

    // an SVG line projection of a plane
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

    // updateMarkers(plane);
    // setInterval(updateMarkers, 30000, plane);
    updateMarkers(icons['paperPlane'].icon);
    setInterval(updateMarkers, 30000, icons['whitePlane'].icon);

}


// add marker to dictionary
async function updateMarkers(icon) {
    let data = await fetch('https://opensky-network.org/api/states/all');
    // const plane1 = 'ab10df';
    // const plane2 = 'ae4a21';
    // const plane3 = 'a328b7';
    // let data = await fetch(`https://opensky-network.org/api/states/all?icao24=${plane1}&icao24=${plane2}&icao24=${plane3}`);
    let response = await data.json();
    for (var i = 0; i < Object.keys(response.states).length; i++) {
        var callsign = response.states[i][1];
        // check for callsign
        if (callsign != null && callsign != "" && callsign != undefined) {
            var longitude = response.states[i][5];
            var latitude = response.states[i][6];
            var onground = response.states[i][8];
            var rotation = response.states[i][10];
            icon.rotation = rotation;

            // check for key in markers, then update or add
            if (callsign in markers) {
                var marker = markers[callsign];

                // console.log('attempting to grab png');
                // const png = document.querySelector(`[src="${marker.uniqueSrc}"]`);
                // console.log(`png: ${png}`);
                // if (png) {
                //     console.log('attempting to rotating');
                //     png.style.transform = `rotate(${rotation}deg)`;
                // }

                // set new icon rotation
                var currentIcon = marker.getIcon();
                currentIcon.rotation = rotation;
                marker.setIcon(currentIcon);

                // move marker recursively
                moveMarker(100, (latitude - marker.getPosition().lat()) / 100, (longitude - marker.getPosition().lng()) / 100, marker);
            } else {
                if (onground == false && latitude != null) {
                    // icon.url += "#"+callsign;

                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(latitude, longitude),
                        icon: icon,
                        title: callsign,
                        // uniqueSrc: icon.url
                    });
                    markers[callsign] = marker;
                    marker.setMap(gmap);
                }
            }
        }
    }

    deleteOldMarkers(response);
}

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
    if (countdown > 0) {
        setTimeout(moveMarker, 300, countdown - 1, latDelta, lngDelta, marker);
    }
}

// remove all markers from map
function clearMarkers() {
    setMapOnAll(null);
}

// sets all maps in the dictionary
function setMapOnAll(map) {
    for (const key in markers) {
        markers[key].setMap(map);
    }
}

function drawMarkerTest() {
    var marker = new google.maps.Marker({
        position: { lat: 30.2672, lng: -97.7431 },
        icon: icons['whitePlane'].icon,
        map: gmap
    });
    marker.setPosition({ lat: 30.7672, lng: -97.2431 });
    marker.setMap(gmap);
}