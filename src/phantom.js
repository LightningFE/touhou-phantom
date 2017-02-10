
const { remote } = require('electron');
const { EventEmitter } = require('events');

const SocketIOClient = require('socket.io-client');

const Settings = require('./lib/settings');
const Tunnel = require('./lib/tunnel');

const { confirmEx } = require('./util');

const RELAY_STATE_STARTED = Symbol.for('RELAY_STATE_STARTED');
const RELAY_STATE_DONE = Symbol.for('RELAY_STATE_DONE');

class WareInfo {
    constructor({
        name, address, port, delta,
    }) {
        this.name = name;
        this.address = address;
        this.port = port;
        this.delta = delta;
    }
}

class RelayInfo {

    constructor({
        socket, address, port,
    }) {
        this.socket = socket;
        this.address = address;
        this.port = port;
        this.deltas = Array(30).fill(0);
        this.delta = 0;
        this.state = null;
        this.guest = null;
    }

    updateDelta(delta) {

        this.deltas.shift();
        this.deltas.push(delta);

        this.delta = delta;

    }

}

class TunnelInfo {
    constructor({
        role, peerId, id, serviceName, state, data,
    }) {
        this.role = role;
        this.peerId = peerId;
        this.id = id;
        this.serviceName = serviceName;
        this.state = state;
        this.data = data;
    }
}

class Phantom extends EventEmitter {

    constructor({
        remoteUrl = 'http://phantom.tldr.run:7777',
        dest = {
            address: '127.0.0.1',
            port: 10800,
        },
    } = {}) {
        super();

        this.remoteUrl = remoteUrl;
        this.dest = dest;

        this.settings = new Settings();

        this.connected = false;
        this.id = null;

        this.wareInfos = [];
        this.relayInfo = null;
        this.tunnels = [];
        this.tunnelInfos = [];

        this.io = new SocketIOClient(this.remoteUrl);

        this.udp = require('dgram').createSocket('udp4');

        require('rpc.io').extend(this.io);

        this.bindEvents();

        this.udp.bind(0, '0.0.0.0');

    }

    bindEvents() {

        this.io.on('connect', () => {

            this.setConnected(true);

            this.io.exec('/api/clients/new', {
                version: remote.app.getVersion(),
                nickname: this.settings.get('nickname'),
            })
            .then(({
                id,
            }) => {

                this.setId(id);

            });

        });

        this.io.on('disconnect', () => {

            this.setConnected(false);

        });

        this.io.expose('/api/tunnels/request', ({
            fromId,
            tunnelId,
            serviceName,
        }) => {
            return new Promise((resolve, reject) => {

                confirmEx(`Tunneling with ${ fromId }?`)
                .then((accept) => {

                    if(accept) {

                        this.createTunnel(null, fromId, tunnelId, serviceName);

                    }

                    resolve({
                        accept,
                    });

                })
                .catch((err) => reject(err));

            });
        });

    }

    setConnected(connected) {
        this.connected = connected;
        this.emit(connected ? 'connected' : 'disconnected');
    }

    setId(id) {
        this.id = id;
        this.emit('idChanged', id);
    }

    raceDelay(wares) {
        return new Promise((resolve, reject) => {

            if(!wares.length) {
                return reject(new Error('ERROR_NO_RACERS'));
            }

            class RacerInfo {

                constructor({
                    ware,
                }) {
                    this.ware = ware;
                    this.deltas = [];
                    this.delta = null;
                }

                calculate() {
                    this.delta = this.deltas.reduce((pv, cv) => pv + cv, 0) / this.deltas.length;
                }

            }

            const timeout = 3000;

            const start = Date.now();

            const racers = wares.map((ware) => new RacerInfo({
                ware,
            }));

            const messageHandler = (msg, rinfo) => {

                if(msg.indexOf('#PHANTOM') == 0) {

                    const now = Date.now();

                    const text = msg.toString('utf-8');
                    const time = parseInt(text.split(' ')[1]);

                    const racer = racers.filter((racer) => {
                        return racer.ware.address == rinfo.address && racer.ware.port == rinfo.port;
                    }).shift();

                    racer.deltas.push(now - time);

                }

            };

            this.udp.on('message', messageHandler);

            wares.map((ware) => {
                for(let i = 0; i < 16; i++) {
                    this.udp.send(Buffer.from(`#PHANTOM ${ start }`), ware.port, ware.address);
                }
            });

            setTimeout(() => {

                this.udp.removeListener('message', messageHandler);

                racers.map((racer) => racer.calculate());

                racers.sort((a, b) => a.delta - b.delta);

                resolve(racers);

            }, timeout);

        });
    }

    startRelay(wareName) {
        return Promise.coroutine(function*() {

            if(!wareName) {

                yield this.updateWares();
                wareName = this.wareInfos[0].name;

            }

            if(this.relayInfo) {
                yield this.destroyRelay();
            }

            const { address, port } = yield this.io.exec('/api/repeats/new', {
                wareName,
            });

            const socket = yield this.setupRelay({
                address, port,
            });

            this.relayInfo = new RelayInfo({
                socket, address, port,
            });

            this.emit('relayDone', this.relayInfo);

            return this.relayInfo;

        }.bind(this))();
    }

    updateWares() {
        return Promise.coroutine(function*() {

            const data = yield fetch(`${ this.remoteUrl }/api/wares`).then((res) => res.json());

            console.info('/api/wares', data);

            const racers = yield this.raceDelay(data.wares);

            console.info('raceDelay', racers);

            this.wareInfos = racers.map((racer) => new WareInfo({
                name: racer.ware.name,
                address: racer.ware.address,
                port: racer.ware.port,
                delta: racer.delta,
            }));

            this.emit('waresUpdated', this.wareInfos);

            return this.wareInfos;

        }.bind(this))();
    }

    setupRelay({
        address, port,
    }) {
        return new Promise((resolve, reject) => {

            const socket = require('dgram').createSocket('udp4');

            // FIXME: Promisify.
            socket.bind(0, '0.0.0.0', () => {

                console.info('udp bound');

            });

            const beating = () => {

                socket.send(Buffer.from(`#PHANTOM ${ Date.now() }`), port, address);

            };

            // TODO:
            socket.on('message', (msg, rinfo) => {

                if(rinfo.address == address && rinfo.port == port) {

                    if(msg.indexOf('#PHANTOM') == 0) {

                        if(!this.relayInfo) {
                            console.error(new Error('ERROR_NO_RELAY_INFO'));
                            return;
                        }

                        const now = Date.now();

                        const text = msg.toString('utf-8');
                        const time = parseInt(text.split(' ')[1]);

                        this.relayInfo.updateDelta(now - time);

                        this.emit('relayUpdate', this.relayInfo);

                    }
                    else if(msg.indexOf('#PHANEVT') == 0) {

                        const parts = msg.toString('utf-8').split(' ');
                        const event = parts[1];

                        this.relayInfo.state = event;

                        if(event == 'GUEST_BOUND') {

                            const guest = parts[2];
                            this.relayInfo.guest = guest;

                        }

                        this.emit('relayUpdate', this.relayInfo);

                    }
                    else {

                        socket.send(msg, this.dest.port, this.dest.address);

                    }

                }
                else if(rinfo.address == this.dest.address && rinfo.port == this.dest.port) {

                    socket.send(msg, port, address);

                }

            });

            const beatingHandle = setInterval(beating, 300);

            socket.on('close', () => {

                clearInterval(beatingHandle);

            });

            resolve(socket);

        });
    }

    destroyRelay() {
        return Promise.coroutine(function*() {

            if(this.relayInfo) {

                yield new Promise((resolve, reject) => {
                    this.relayInfo.socket.close(resolve);
                });

                this.relayInfo = null;

            }
            else {
                resolve();
            }

        }.bind(this))();
    }

    startTunnel(peerId, serviceName) {
        return new Promise((resolve, reject) => {

            const toId = parseInt(peerId);

            this.io.exec('/api/tunnels/request', {
                toId, serviceName,
            })
            .then(({
                accept,
                tunnelId,
            }) => {

                if(accept) {

                    this.createTunnel('source', toId, tunnelId, serviceName);

                }

                resolve(accept);

            });

        });
    }

    createTunnel(role, peerId, id, serviceName) {

        const tunnel = new Tunnel({
            phantom: this,
            role, peerId, id, serviceName,
        });

        this.tunnels.push(tunnel);

        tunnel.on('stateChanged', (state) => {

            this.tunnelInfos = this.tunnels.map(({
                role, peerId, id, serviceName, state, data,
            }) => new TunnelInfo({
                role, peerId, id, serviceName, state, data,
            }));

            this.emit('tunnelStateChanged', this.tunnelInfos);

        });

    }

}

const phantom = new Phantom();

module.exports = phantom;
