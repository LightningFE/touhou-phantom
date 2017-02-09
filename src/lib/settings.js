
const TAG = 'phantom-settings';

class Settings {

    constructor() {

        this.load();

    }

    load() {

        const data = localStorage.getItem(TAG);

        return this.settings = data ? JSON.parse(data) : {};

    }

    save() {
        return localStorage.setItem(TAG, JSON.stringify(this.settings));
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        return this.settings[key] = value;
    }

    keys() {
        return Object.keys(this.settings);
    }

}

module.exports = Settings;
