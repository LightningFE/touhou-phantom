
const Promise = require('bluebird');
const co = gen => Promise.coroutine(gen)();

const { EventEmitter } = require('events');
const { join, resolve: resolvePath } = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { createHash } = require('crypto');
const { spawn } = require('child_process');

const { app, dialog } = require('electron');

const debug = require('debug')('updater');

const request = require('request');

const tmp = require('tmp');

// Share with `evshiron/nsis-nuts`.

function hash(type, path) {
    return new Promise((resolve, reject) => {

        const hasher = createHash(type);

        hasher.on('error', reject);

        hasher.on('readable', () => {

            const data = hasher.read();

            if(data) {
                resolve(data.toString('hex'));
            }

        });

        createReadStream(path).pipe(hasher);

    });
}

function download(url, path) {
    return new Promise((resolve, reject) => {

        request(url, {}, (err, res) => {

            if(err) {
                return reject(err);
            }

            resolve();

        })
        .pipe(createWriteStream(path));

    });
}

class NsisAutoUpdater extends EventEmitter {

    constructor({
        baseUrl, channel,
    }) {
        super();

        this.baseUrl = baseUrl;
        this.channel = channel;

        this.versions = null;

    }

    getVersions() {
        return new Promise((resolve, reject) => {

            const url = `${ this.baseUrl }/versions.json`;

            request(url, {}, (err, res, body) => {

                if(err) {
                    return reject(err);
                }

                resolve(JSON.parse(body));

            });

        });
    }

    checkForUpdates() {
        return co(function*() {

            console.log('checkForUpdates');

            this.versions = yield this.getVersions();

            const { version } = this.versions.channels[this.channel];
            const upgradable = app.getVersion() != version;

            console.log(`upgradable: ${ upgradable }`);
            if(upgradable) {

                const file = this.versions.files.filter(file => file.version == version).shift();

                if(!file) {
                    throw new Error('ERROR_FILE_NOT_EXISTS');
                }

                return {
                    version, upgradable, file,
                };

            }
            else {
                return {
                    version, upgradable,
                };
            }

        }.bind(this));
    }

    downloadUpdate(file) {
        return co(function*() {

            console.log('downloadUpdate');

            const path = yield Promise.promisify(tmp.file)({
                postfix: '.exe',
                discardDescriptor: true,
            });

            const url = `${ this.baseUrl }/${ file.path }`;

            yield download(url, path);

            const sha256 = yield hash('sha256', path);

            if(sha256 != file.sha256) {
                throw new Error('ERROR_SHA256_MISMATCH');
            }

            return {
                path,
                version: file.version,
            };

        }.bind(this));
    }

    install(path, slient = false) {

        console.log('install');
        console.log(`path: ${ path }`);

        const args = [ '--updated' ];
        const options = {
            detached: true,
            stdio: 'ignore',
        };

        if(slient) {
            args.push('/S');
        }

        try {

            spawn(path, args, options)
            .unref();

        }
        catch(err) {

            if(err.code == 'UNKNOWN') {

                const elevate = join(process.resourcesPath, 'elevate.exe');

                spawn(elevate, [ path, ...args ], options)
                .unref();

            }
            else {
                throw err;
            }

        }

    }

    installWhenQuit(path) {

        console.log('installWhenQuit');

        app.on('quit', () => this.install(path, true));

    }

    quitAndInstall(path) {

        console.log('quitAndInstall');

        this.install(path, false);

        app.quit();

    }

}

module.exports = NsisAutoUpdater;
