var gmap;
var markers = [];
var plane = {
    path: 'M 180 40Q160 45 160 70L160 130L60 190L60 210L160 180L170 280L150 290L140 310L220 310L210 290L190 280L200 180L300 210L300 190L200 130L200 70Q200 45 180 40',
    fillColor: 'white',
    // anchor: new google.maps.Point(18,16),
    fillOpacity: .8,
    scale: .1,
    rotation: 0,
    strokeColor: 'black',
    strokeWeight: 1
};

function initMap() {
    gmap = new google.maps.Map(document.getElementById('gmap'), {
        center: { lat: 30.2672, lng: -97.7431 },
        zoom: 8,
        draggable: true
    });

    var marker = new google.maps.Marker({
        position: gmap.getCenter(),
        icon: plane,
        map: gmap
    });

    var marker2 = new google.maps.Marker({
        position: { lat: 30.5672, lng: -97.4431 },
        icon: plane,
        map: gmap
    });

    addMarker( { lat: 30.7672, lng: -97.6431 }, plane);
}

function addMarker(location, icon) {
    var marker = new google.maps.Marker({
      position: location,
      icon: icon,
      map: gmap,
      identifier: "aa21"
    });
    markers.push(marker);
}

function drawAllMarkers() {
    for (var i = 0; i < markers.length; i++) {
        addMarker[i].setMap(gmap);
    }
}

function deleteAllMarkers() {
    setMapOnAll(null);
    markers = [];
}

