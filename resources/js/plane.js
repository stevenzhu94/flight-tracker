class Plane {
    constructor(icao, song) {
        this.icao = icao;
        this.song = song;
        this.updated = Date.now();
    }

    getId() {
        return this.icao;
    }

    getSong() {
        return this.song;
    }

    getLastUpdated() {
        return this.updated;
    }

    updateSong(song) {
        this.song = song;
        this.updated = Date.now();
    }
}

module.exports = Plane;