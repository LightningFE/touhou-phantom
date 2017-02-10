
const { EventEmitter } = require('events');

const phantom = require('../phantom');

const Channel = require('./channel');
const { serviceLookup } = require('./services');

const STATE_STARTED = Symbol.for('TUNNEL_STATE_STARTED');
const STATE_CHECKING = Symbol.for('TUNNEL_STATE_CHECKING');
const STATE_CONNECTED = Symbol.for('TUNNEL_STATE_CONNECTED');
const STATE_DONE = Symbol.for('TUNNEL_STATE_DONE');
const STATE_DISCONNECTED = Symbol.for('TUNNEL_STATE_DISCONNECTED');

class Tunnel extends EventEmitter {

    constructor({
        phantom, role, peerId, id, serviceName,
    }) {
        super();

        // Must have instead of singleton, due to circular require.
        this.phantom = phantom;

        this.role = role;
        this.peerId = peerId;
        this.id = id;
        this.serviceName = serviceName;

        this.state = 'UNKNOWN';

        this.connection = null;
        this.channel = null;
        this.service = null;

        this.data = null;

        this.setupTunnel(role, peerId, id);

    }

    setState(state) {
        this.state = state;
        this.emit('stateChanged', state);
    }

    setData(data) {
        this.data = data;
        this.emit('stateChanged', this.state);
    }

    setupTunnel(role, peerId, tunnelId) {
        return Promise.coroutine(function*() {

            const pc = new webkitRTCPeerConnection({
                iceServers: [{
                    urls: 'turn:106.185.35.36:3478',
                }],
            });

            this.connection = pc;

            this.setState(STATE_STARTED);

            console.info('channel new');

            if(role == 'source') {

                const channel = pc.createDataChannel('channel');
                channel.onopen = (event) => {

                    console.info('channel open');

                    this.setupChannel(channel);

                };

            }
            else {

                pc.ondatachannel = (event) => {

                    console.info('datachannel', event.channel);

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

                    console.info('icecandidate', event.candidate);

                    this.phantom.io.emit('tunnel', {
                        id: tunnelId,
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

                    //console.info(this.candidates);
                    //pc.close();

                }

            };

            if(role == 'source') {

                const desc = yield pc.createOffer();

                pc.setLocalDescription(desc);

                this.phantom.io.emit('tunnel', {
                    id: tunnelId,
                    data: {
                        type: 'sdp',
                        data: desc,
                    },
                });

            }

            this.phantom.io.on('tunnel', ({
                id,
                data: {
                    type, data,
                },
            }) => {

                if(id != tunnelId) {
                    return;
                }

                //console.info('tunnel', id, type, data);

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
                                        id,
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

            this.channel = new Channel(channel);

            const s = serviceLookup(this.serviceName);

            if(!s) {
                throw new Error('SERVICE_NOT_FOUND');
            }

            const { Service } = s;

            const service = new Service(this);

            service.on('data', data => this.setData(data));

            yield service.start();

            this.service = service;

        }.bind(this))();
    }

}

module.exports = Tunnel;
