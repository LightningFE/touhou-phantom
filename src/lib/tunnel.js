
const { EventEmitter } = require('events');

const phantom = require('../phantom');

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

        this.dest = {
            address: '127.0.0.1',
            port: 10800,
        };

        this.connection = null;
        this.channel = null;

        this.localAddress = null;

        this.setupTunnel(role, peerId, identity);

    }

    setState(state) {
        this.state = state;
        this.emit('stateChanged', state);
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

            const source = {
                address: null,
                port: null,
            };

            const udp = require('dgram').createSocket('udp4');

            // FIXME: Promisify.
            udp.bind(0, '0.0.0.0', () => {

                console.log('udp bound');

                this.localAddress = `127.0.0.1:${ udp.address().port }`;

                this.setState(STATE_DONE);

            });

            udp.on('message', (msg, rinfo) => {

                if(this.role == 'source' && !source.address && !source.port) {

                    source.address = rinfo.address;
                    source.port = rinfo.port;

                }

                channel.send(msg.toString('base64'));

            });

            channel.onmessage = (event) => {

                console.log('channel message', event.data);

                if(event.data.indexOf('{') == 0) {

                    const data = JSON.parse(event.data);

                    switch(data.type) {
                    case 'echo':

                        channel.send(JSON.stringify({
                            type: 'reply',
                            data: data.data,
                        }));

                        break;
                    }

                }
                else {

                    const buf = Buffer.from(event.data, 'base64');

                    if(this.role == 'source') {

                        if(source.address && source.port) {

                            udp.send(buf, source.port, source.address);

                        }
                        else {
                            console.warn('WARN_NO_SOURCE');
                        }

                    }
                    else {

                        udp.send(buf, this.dest.port, this.dest.address);

                    }

                }

            };

            const beating = () => {

                channel.send(JSON.stringify({
                    type: 'echo',
                    data: Date.now(),
                }));

            };

            channel.send(JSON.stringify({
                type: 'message',
                data: 'Hello world!',
            }));

            channel.onclose = (event) => {

                console.log('channel close');

                // TODO: Release resources.


            };

        }.bind(this))();

    }

}

module.exports = Tunnel;
