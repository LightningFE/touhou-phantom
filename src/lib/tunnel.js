
const { EventEmitter } = require('events');

const phantom = require('../phantom');

const TH123Service = require('./tunnelServices/th123');

const STATE_STARTED = Symbol.for('TUNNEL_STATE_STARTED');
const STATE_CHECKING = Symbol.for('TUNNEL_STATE_CHECKING');
const STATE_CONNECTED = Symbol.for('TUNNEL_STATE_CONNECTED');
const STATE_DONE = Symbol.for('TUNNEL_STATE_DONE');
const STATE_DISCONNECTED = Symbol.for('TUNNEL_STATE_DISCONNECTED');

class Tunnel extends EventEmitter {

    constructor({
        phantom, role, peerId, identity,
    }) {
        super();

        // Must have instead of singleton, due to circular require.
        this.phantom = phantom;

        this.role = role;
        this.peerId = peerId;
        this.identity = identity;

        this.state = 'UNKNOWN';

        this.services = [];

        this.connection = null;
        this.channel = null;

        this.data = null;

        this.setupTunnel(role, peerId, identity);

    }

    setState(state) {
        this.state = state;
        this.emit('stateChanged', state);
    }

    setData(data) {
        this.data = data;
        this.emit('stateChanged', this.state);
    }

    setupTunnel(role, peerId, tunnelIdentity) {
        return Promise.coroutine(function*() {

            const pc = new webkitRTCPeerConnection({
                iceServers: [{
                    urls: 'turn:106.185.35.36:3478',
                }],
            });

            this.connection = pc;

            this.setState(STATE_STARTED);

            console.log('channel new');

            if(role == 'source') {

                const channel = pc.createDataChannel('channel');
                channel.onopen = (event) => {

                    console.log('channel open');

                    this.channel = channel;

                    this.setupChannel(channel);

                };

            }
            else {

                pc.ondatachannel = (event) => {

                    console.log('datachannel', event.channel);

                    this.channel = event.channel;

                    this.setupChannel(event.channel);

                };

            }

            pc.oniceconnectionstatechange = (event) => {

                switch(pc.iceConnectionState) {
                case 'checking':
                    this.setState(STATE_CHECKING);
                    break;
                case 'connected':
                case 'completed':
                    this.setState(STATE_CONNECTED);
                    break;
                case 'disconnected':
                    this.setState(STATE_DISCONNECTED);
                    break;
                }

            };

            pc.onicecandidate = (event) => {

                if(event.candidate) {

                    console.log('icecandidate', event.candidate);

                    this.phantom.io.emit('tunnel', {
                        identity: tunnelIdentity,
                        data: {
                            type: 'candidate',
                            data: event.candidate,
                        },
                    });

                    //const candidate = parseCandidate(event.candidate.candidate);
                    //this.candidates.push(candidate);

                }
                else {

                    // Ended.

                    //console.log(this.candidates);
                    //pc.close();

                }

            };

            if(role == 'source') {

                const desc = yield pc.createOffer();

                pc.setLocalDescription(desc);

                this.phantom.io.emit('tunnel', {
                    identity: tunnelIdentity,
                    data: {
                        type: 'sdp',
                        data: desc,
                    },
                });

            }

            this.phantom.io.on('tunnel', ({
                identity,
                data: {
                    type, data,
                },
            }) => {

                if(identity != tunnelIdentity) {
                    return;
                }

                //console.log('tunnel', identity, type, data);

                switch(type) {
                case 'sdp':

                    if(role == 'source') {

                        pc.setRemoteDescription(new RTCSessionDescription(data));

                    }
                    else {

                        pc.setRemoteDescription(new RTCSessionDescription(data))
                        .then(() => {

                            if(pc.remoteDescription.type == 'offer') {

                                pc.createAnswer()
                                .then((desc) => {

                                    pc.setLocalDescription(desc);

                                    this.phantom.io.emit('tunnel', {
                                        identity,
                                        data: {
                                            type: 'sdp',
                                            data: desc,
                                        },
                                    });

                                });

                            }

                        });

                    }

                    break;
                case 'candidate':

                    pc.addIceCandidate(new RTCIceCandidate(data));

                    break;
                }

            });

        }.bind(this))();
    }

    setupChannel(channel) {
        return Promise.coroutine(function*() {

            const services = [TH123Service].map((Service) => {

                const service = new Service(this);

                service.on('data', data => this.setData(data));

                return new Promise((resolve, reject) => {
                    service.start()
                    .then(() => resolve(service))
                    .catch(reject);
                });

            });

            this.services = [...this.services, ...services];

        }.bind(this))();
    }

}

module.exports = Tunnel;
