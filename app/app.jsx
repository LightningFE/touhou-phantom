
const { clipboard } = require('electron');

import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { Panel, Grid, Col, Row, Navbar, Nav, NavItem, Tabs, Tab, Table, FormGroup, ControlLabel, InputGroup, FormControl, ProgressBar, Button, DropdownButton, MenuItem, Glyphicon } from 'react-bootstrap';

const SocketIOClient = require('socket.io-client');

var Promise = require('bluebird');

const RTCPeerConnection = webkitRTCPeerConnection;

const MSG_SIGNAL = '#PHANTOM';

function parseCandidate(text) {

    const pos = text.indexOf('candidate:') + 'candidate:'.length;
    const fields = text.substr(pos).split(' ');
    return {
        'component': fields[1],
        'type': fields[7],
        'foundation': fields[0],
        'protocol': fields[2],
        'address': fields[4],
        'port': fields[5],
        'priority': fields[3],
    };

}

class Tunnel {

    constructor({
        role, peerId, identity,
    }) {

        this.role = role;
        this.peerId = peerId;
        this.identity = identity;

        this.state = 'UNKNOWN';

        this.connection = null;
        this.channel = null;

        this.localAddress = null;

    }

}

class App extends Component {

    constructor(props) {
        super(props);

        this.title = 'Phantom';
        this.remoteUrl = 'http://phantom.tldr.run:7777';
        this.dest = {
            address: '127.0.0.1',
            port: 10800,
        };

        this.state = {
            identity: -1,
            connected: false,
            wares: [],
            selectedWareName: '',
            relayState: 'UNKNOWN',
            relayAddress: '',
            tunnels: [],
            peerId: '',
        };

        this.io = new SocketIOClient(this.remoteUrl);

        this.udp = require('dgram').createSocket('udp4');

        this.candidates = [];

        require('rpc.io').extend(this.io);

        this.io.on('connect', () => {

            this.setState({
                connected: true,
            });

            this.io.exec('/api/clients/new')
            .then(({
                identity,
            }) => {

                this.setState({
                    identity,
                });

            });

        });

        this.io.on('disconnect', () => {

            this.setState({
                connected: false,
            });

        });

        this.io.expose('/api/tunnels/request', ({
            fromIdentity,
            tunnelIdentity,
        }) => {
            return new Promise((resolve, reject) => {

                const accept = confirm(`Tunneling with ${ fromIdentity }?`);

                if(accept) {

                    this.setupTunnel(null, fromIdentity, tunnelIdentity);

                }

                resolve({
                    accept,
                });

            });
        });

        this.udp.bind(0, '0.0.0.0');

    }

    componentDidMount() {

        document.title = this.title;

    }

    raceDelay(wares) {
        return new Promise((resolve, reject) => {

            if(!wares.length) {
                return reject(new Error('ERROR_NO_RACERS'));
            }

            const timeout = 3000;

            const start = Date.now();

            const racers = wares.map((ware) => {
                return {
                    ware,
                    deltas: [],
                    delta: null,
                };
            });

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
                for(let i = 0; i < 8; i++) {
                    this.udp.send(Buffer.from(`#PHANTOM ${ start }`), ware.port, ware.address);
                }
            });

            setTimeout(() => {

                this.udp.removeListener('message', messageHandler);

                racers.map((racer) => {
                    racer.delta = racer.deltas.reduce((pv, cv) => pv + cv, 0) / racer.deltas.length;
                });

                racers.sort((a, b) => {
                    return a.delta - b.delta;
                });

                resolve(racers);

            }, timeout);

        });
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

                    if(msg.indexOf(MSG_SIGNAL) == 0) {

                        // TODO: Calculate delay.


                    }
                    else {

                        udp.send(msg, this.dest.port, this.dest.address);

                    }

                }
                else if(rinfo.address == this.dest.address && rinfo.port == this.dest.port) {

                    udp.send(msg, port, address);

                }

            });

            // TODO: Release resources.


            setInterval(beating, 1000);

            resolve();

        });
    }

    setupTunnel(role, peerId, tunnelIdentity) {
        return Promise.coroutine(function*() {

            const tunnel = new Tunnel({
                role, peerId,
                identity: tunnelIdentity,
            });

            const updateTunnelState = () => {
                this.setState({
                    tunnels: this.state.tunnels.map((t) => {
                        if(t.tunnelIdentity == tunnelIdentity) {
                            return tunnel;
                        }
                        else {
                            return t;
                        }
                    }),
                });
            };

            const pc = new RTCPeerConnection({
                iceServers: [{
                    urls: 'turn:106.185.35.36:3478',
                }],
            });

            tunnel.connection = pc;
            tunnel.state = 'STARTED';

            this.setState({
                tunnels: [...this.state.tunnels, tunnel],
            });

            console.log('channel new');

            if(role == 'source') {

                const channel = pc.createDataChannel('channel');
                channel.onopen = (event) => {

                    console.log('channel open');

                    tunnel.channel = channel;
                    updateTunnelState();

                    this.setupChannel(tunnel, channel, updateTunnelState);

                };

            }
            else {

                pc.ondatachannel = (event) => {

                    console.log('datachannel', event.channel);

                    tunnel.channel = event.channel;
                    updateTunnelState();

                    this.setupChannel(tunnel, event.channel, updateTunnelState);

                };

            }

            pc.oniceconnectionstatechange = (event) => {

                switch(pc.iceConnectionState) {
                case 'checking':
                    tunnel.state = 'CHECKING';
                    break;
                case 'connected':
                case 'completed':
                    tunnel.state = 'CONNECTED';
                    break;
                case 'disconnected':
                    tunnel.state = 'DISCONNECTED';
                    break;
                }

                updateTunnelState();

            };

            pc.onicecandidate = (event) => {

                if(event.candidate) {

                    console.log('icecandidate', event.candidate);

                    this.io.emit('tunnel', {
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

                this.io.emit('tunnel', {
                    identity: tunnelIdentity,
                    data: {
                        type: 'sdp',
                        data: desc,
                    },
                });

            }

            this.io.on('tunnel', ({
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

                                    this.io.emit('tunnel', {
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

    setupChannel(tunnel, channel, updateTunnelState) {
        return Promise.coroutine(function*() {

            const source = {
                address: null,
                port: null,
            };

            const udp = require('dgram').createSocket('udp4');

            // FIXME: Promisify.
            udp.bind(0, '0.0.0.0', () => {

                console.log('udp bound');

                tunnel.localAddress = `127.0.0.1:${ udp.address().port }`;
                updateTunnelState();

            });

            udp.on('message', (msg, rinfo) => {

                if(tunnel.role == 'source' && !source.address && !source.port) {

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

                    if(tunnel.role == 'source') {

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

    startRelaying() {
        return Promise.coroutine(function*() {

            this.setState({
                relayState: 'RELAY_STARTED',
            });

            let wareName = null;

            if(this.state.selectedWareName) {

                wareName = this.state.selectedWareName;

            }
            else {

                const { err, wares } = yield fetch(`${ this.remoteUrl }/api/wares`).then((res) => res.json());

                console.log('/api/wares', err, wares);

                this.setState({
                    relayState: 'WARES_GOT',
                });

                const racers = yield this.raceDelay(wares);

                console.log('raceDelay', racers);

                this.setState({
                    wares: racers.map((racer) => {
                        return {
                            name: racer.ware.name,
                            address: racer.ware.address,
                            port: racer.ware.port,
                            delta: racer.delta,
                        };
                    }),
                    selectedWareName: '',
                    relayState: 'WARES_RACED',
                });

                wareName = racers[0].ware.name;

            }

            const { address, port } = yield this.io.exec('/api/repeats/new', {
                wareName,
            });

            yield this.setupRelay({
                address, port,
            });

            this.setState({
                relayState: 'RELAY_DONE',
                relayAddress: `${ address }:${ port }`,
            });

        }.bind(this))();
    }

    startTunneling() {
        return new Promise((resolve, reject) => {

            const toIdentity = parseInt(this.state.peerId);

            this.io.exec('/api/tunnels/request', {
                toIdentity,
            })
            .then(({
                accept,
                tunnelIdentity,
            }) => {

                alert(`${ accept ? 'Accepted' : 'Denied' }.`);

                if(accept) {

                    this.setupTunnel('source', toIdentity, tunnelIdentity);

                }

            });

        });
    }

    onRelayCopyClick() {

        clipboard.writeText(this.state.relayAddress);

        alert(`"${ this.state.relayAddress }" is copied.`);

    }

    onRelayClick() {

        this.startRelaying()
        .catch((err) => {

            this.setState({
                relayState: err.message,
            });

        });

    }

    onTunnelCopyClick(localAddress) {

        clipboard.writeText(localAddress);

        alert(`"${ localAddress }" is copied.`);

    }

    onTunnelClick() {

        this.startTunneling();

    }

    render() {

        const relayServers = this.state.wares.map((ware) => {
            return (
                <MenuItem
                    active={ this.state.selectedWareName == ware.name }
                    onClick={ () => this.setState({
                        selectedWareName: ware.name,
                    }) }
                ><span title={ ware.name }>{ ware.address }</span> - <span>{ ware.delta }ms</span></MenuItem>
            );
        });

        const relayProgressNow = (() => {
            switch(this.state.relayState) {
            case 'UNKNOWN':
                return 0;
            case 'RELAY_STARTED':
                return 25;
            case 'WARES_GOT':
                return 50;
            case 'WARES_RACED':
                return 75;
            case 'RELAY_DONE':
            default:
                return 100;
            }
        })();

        const relayProgressStyle = (() => {

            if(this.state.relayState.includes('ERROR')) {
                return 'danger';
            }

            switch(this.state.relayState) {
            case 'RELAY_DONE':
                return 'success';
            default:
                return null;
            }

        })();

        const tunnelTabs = this.state.tunnels.map((tunnel, idx) => {
            return (
                <Tab title={ `${ tunnel.peerId } - ${ tunnel.state }` }
                    eventKey={ idx + 1 }
                >
                    <Panel
                        className="tab-panel"
                    >
                        <Table
                            striped={ true }
                            bordered={ true }
                            condensed={ true }
                            hover={ true }
                        >
                            <tbody>
                                <tr>
                                    <td>Source</td>
                                    <td>{ tunnel.role == 'source' ? 'True' : 'False' }</td>
                                </tr>
                                <tr>
                                    <td>Peer Id</td>
                                    <td>{ tunnel.peerId }</td>
                                </tr>
                                <tr>
                                    <td>Identity</td>
                                    <td>{ tunnel.identity }</td>
                                </tr>
                                <tr>
                                    <td>State</td>
                                    <td>{ tunnel.state }</td>
                                </tr>
                                <tr>
                                    <td>Local Address</td>
                                    <td>
                                        <span>{ tunnel.localAddress }</span> - <a onClick={ this.onTunnelCopyClick.bind(this, tunnel.localAddress) }>Copy</a>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </Panel>
                </Tab>
            );
        });

        return (
            <div>
                <Navbar inverse={ true }
                    fixedTop={ true }
                >
                    <Navbar.Header>
                        <Navbar.Brand>{ this.title }#{ this.state.identity }</Navbar.Brand>
                        <Navbar.Toggle />
                    </Navbar.Header>
                    <Navbar.Collapse>
                        <Nav pullRight={ true }>
                            <NavItem>{ this.state.connected ? 'Connected' : 'Disconnected' }</NavItem>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
                <div
                    className="body"
                >
                    <Tabs bsStyle="pills"
                        defaultActiveKey={ 0 }
                        animation={ false }
                    >
                        <Tab title="Relaying"
                            eventKey={ 0 }
                        >
                            <Panel
                                className="tab-panel"
                            >
                                <Grid>
                                    <Row>
                                        <Col sm={ 12 }>
                                            <FormGroup>
                                                <ControlLabel>Relay Address</ControlLabel>
                                                <InputGroup>
                                                    <InputGroup.Button>
                                                        <DropdownButton>
                                                            <MenuItem header={ true }>Servers</MenuItem>
                                                            <MenuItem
                                                                active={ this.state.selectedWareName == '' }
                                                                onClick={ () => this.setState({
                                                                    selectedWareName: '',
                                                                }) }
                                                            >Auto</MenuItem>
                                                            { relayServers }
                                                        </DropdownButton>
                                                    </InputGroup.Button>
                                                    <FormControl type="text"
                                                        value={ this.state.relayAddress }
                                                    />
                                                    <InputGroup.Button>
                                                        <Button
                                                            onClick={ this.onRelayCopyClick.bind(this) }
                                                        >
                                                            <Glyphicon glyph="copy" />
                                                        </Button>
                                                        <Button
                                                            onClick={ this.onRelayClick.bind(this) }
                                                        >Relay</Button>
                                                    </InputGroup.Button>
                                                </InputGroup>
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={ 12 }>
                                            <ProgressBar
                                                label={ this.state.relayState }
                                                now={ relayProgressNow }
                                                active={ relayProgressNow > 0 && relayProgressNow < 100 }
                                                bsStyle={ relayProgressStyle }
                                            />
                                        </Col>
                                    </Row>
                                </Grid>
                            </Panel>
                        </Tab>
                        <Tab title="Tunneling"
                            eventKey={ 1 }
                        >
                            <Panel
                                className="tab-panel"
                            >
                                <Tabs bsStyle="pills"
                                    defaultActiveKey={ 0 }
                                    animation={ false }
                                >
                                    <Tab title="+"
                                        eventKey={ 0 }
                                    >
                                        <Panel
                                            className="tab-panel"
                                        >
                                            <FormGroup>
                                                <ControlLabel>Peer Id</ControlLabel>
                                                <InputGroup>
                                                    <FormControl type="text"
                                                        value={ this.state.peerId }
                                                        onChange={ (event) => this.setState({
                                                            peerId: event.target.value,
                                                        }) }
                                                    />
                                                    <InputGroup.Button>
                                                        <Button
                                                            onClick={ this.onTunnelClick.bind(this) }
                                                        >Tunnel</Button>
                                                    </InputGroup.Button>
                                                </InputGroup>
                                            </FormGroup>
                                        </Panel>
                                    </Tab>
                                    { tunnelTabs }
                                </Tabs>
                            </Panel>
                        </Tab>
                    </Tabs>
                </div>
            </div>
        );

    }

}

ReactDOM.render(<App />, document.getElementById('root'));
