
const { EventEmitter } = require('events');

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
        address, port,
    }) {
        this.address = address;
        this.port = port;
        this.deltas = Array(30).fill(0);
        this.delta = 0;
    }

    updateDelta(delta) {

        this.deltas.shift();
        this.deltas.push(delta);

        this.delta = delta;

    }

}

class TunnelInfo {
    constructor({
        role, peerId, identity, state, localAddress,
    }) {
        this.role = role;
        this.peerId = peerId;
        this.identity = identity;
        this.state = state;
        this.localAddress = localAddress;
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

        this.connected = false;
        this.wareInfos = [];
        this.relayInfo = null;
        this.tunnels = [];
        this.tunnelInfos = [];

        this.io = new (require('socket.io-client'))(this.remoteUrl);

        this.udp = require('dgram').createSocket('udp4');

        this.candidates = [];

        require('rpc.io').extend(this.io);

        this.io.on('connect', () => {

            this.setConnected(true);

            this.io.exec('/api/clients/new')
            .then(({
                identity,
            }) => {

                this.setIdentity(identity);

            });

        });

        this.io.on('disconnect', () => {

            this.setConnected(false);

        });

        this.io.expose('/api/tunnels/request', ({
            fromIdentity,
            tunnelIdentity,
        }) => {
            return new Promise((resolve, reject) => {

                confirmEx(`Tunneling with ${ fromIdentity }?`)
                .then((accept) => {

                    if(accept) {

                        this.createTunnel(null, fromIdentity, tunnelIdentity);

                    }

                    resolve({
                        accept,
                    });

                })
                .catch((err) => reject(err));

            });
        });

        this.udp.bind(0, '0.0.0.0');

    }

    setConnected(connected) {
        this.connected = connected;
        this.emit(connected ? 'connected' : 'disconnected');
    }

    setIdentity(identity) {
        this.identity = identity;
        this.emit('identityChanged', identity);
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

            const { address, port } = yield this.io.exec('/api/repeats/new', {
                wareName,
            });

            yield this.setupRelay({
                address, port,
            });

            this.relayInfo = new RelayInfo({
                address, port,
            });

            this.emit('relayDone', this.relayInfo);

            return this.relayInfo;

        }.bind(this))();
    }

    updateWares() {
        return Promise.coroutine(function*() {

            const { err, wares } = yield fetch(`${ this.remoteUrl }/api/wares`).then((res) => res.json());

            console.log('/api/wares', err, wares);

            const racers = yield this.raceDelay(wares);

            console.log('raceDelay', racers);

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

            const udp = require('dgram').createSocket('udp4');

            // FIXME: Promisify.
            udp.bind(0, '0.0.0.0', () => {

                console.log('udp bound');

            });

            const beating = () => {

                udp.send(Buffer.from(`#PHANTOM ${ Date.now() }`), port, address);

            };

            // TODO:
            udp.on('message', (msg, rinfo) => {

                if(rinfo.address == address && rinfo.port == port) {

                    if(msg.indexOf('#PHANTOM') == 0) {

                        if(!this.relayInfo) {
                            console.error('ERROR_NO_RELAY_INFO');
                            return;
                        }

                        const now = Date.now();

                        const text = msg.toString('utf-8');
                        const time = parseInt(text.split(' ')[1]);

                        this.relayInfo.updateDelta(now - time);

                        this.emit('relayUpdate', this.relayInfo);

                    }
                    else {

                        udp.send(msg, this.dest.port, this.dest.address);

                    }

                }
                else if(rinfo.address == this.dest.address && rinfo.port == this.dest.port) {

                    udp.send(msg, port, address);

                }

            });

            // FIXME: Release resources.


            setInterval(beating, 1000);

            resolve();

        });
    }

    startTunnel(peerId) {
        return new Promise((resolve, reject) => {

            const toIdentity = parseInt(peerId);

            this.io.exec('/api/tunnels/request', {
                toIdentity,
            })
            .then(({
                accept,
                tunnelIdentity,
            }) => {

                if(accept) {

                    this.createTunnel('source', toIdentity, tunnelIdentity);

                }

                resolve(accept);

            });

        });
    }

    createTunnel(role, peerId, identity) {

        const tunnel = new Tunnel({
            phantom: this,
            role, peerId, identity,
        });

        this.tunnels.push(tunnel);

        tunnel.on('stateChanged', (state) => {

            this.tunnelInfos = this.tunnels.map(({
                role, peerId, identity, state, localAddress,
            }) => new TunnelInfo({
                role, peerId, identity, state, localAddress,
            }));

            this.emit('tunnelStateChanged', this.tunnelInfos);

        });

    }

}

const phantom = new Phantom();

module.exports = phantom;
