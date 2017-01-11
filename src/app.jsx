
window.Promise = require('bluebird');

import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { MuiThemeProvider, getMuiTheme } from 'material-ui/styles';
import { AppBar, Drawer, Paper, Menu, MenuItem, Divider, IconButton } from 'material-ui';
import IconConnected from 'material-ui/svg-icons/device/signal-cellular-4-bar';
import IconDisconnected from 'material-ui/svg-icons/device/signal-cellular-0-bar';

import RelayingComponent from './components/relaying';
import TunnelingComponent from './components/tunneling';

const phantom = require('./phantom');

const CONTENT_RELAYING = Symbol('CONTENT_RELAYING');
const CONTENT_TUNNELING = Symbol('CONTENT_TUNNELING');

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

class App extends Component {

    constructor(props) {
        super(props);

        this.title = 'Phantom';

        this.state = {
            drawerShowed: true,
            content: '',
            connected: false,
            identity: '',
        };

    }

    componentDidMount() {

        document.title = this.title;

        console.log(phantom);

        this.setState({
            connected: phantom.connected,
            identity: phantom.identity,
        });

        phantom.on('connected', () => {
            this.setState({
                connected: true,
            });
        });

        phantom.on('disconnected', () => {
            this.setState({
                connected: false,
            });
        });

        phantom.on('identityChanged', (identity) => {
            this.setState({
                identity,
            });
        });

    }

    setContent(content) {
        this.setState({
            content,
        });
    }

    toggleDrawer() {
        this.setState({
            drawerShowed: !this.state.drawerShowed,
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

        const connectionIndicator = (
            <IconButton tooltip={ this.state.connected ? '已连接' : '已断开' }>
                { this.state.connected ? <IconConnected /> : <IconDisconnected /> }
            </IconButton>
        );

        return (
            <MuiThemeProvider muiTheme={ getMuiTheme({ userAgent: 'Chrome' }) }>
                <div>
                    <AppBar title={ this.title } iconElementRight={ connectionIndicator } onLeftIconButtonTouchTap={ this.toggleDrawer.bind(this) } />
                    <Drawer open={ this.state.drawerShowed } docked={ false } onRequestChange={ this.toggleDrawer.bind(this) }>
                        <AppBar title={ this.title } onLeftIconButtonTouchTap={ this.toggleDrawer.bind(this) } />
                        <MenuItem>#{ this.state.identity }</MenuItem>
                        <Divider />
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(CONTENT_RELAYING); } }>中转服务</MenuItem>
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(CONTENT_TUNNELING); } }>穿透服务</MenuItem>
                        <MenuItem onTouchTap={ this.toggleDrawer.bind(this) }>其它</MenuItem>
                        <Divider />
                        <MenuItem checked={ true }>东方非想天则</MenuItem>
                        <Divider />
                        <MenuItem onTouchTap={ this.toggleDrawer.bind(this) }>帮助</MenuItem>
                        <MenuItem onTouchTap={ this.toggleDrawer.bind(this) }>关于</MenuItem>
                    </Drawer>
                    <div style={{
                        margin: 8,
                    }}>
                        { (() => {
                            switch(this.state.content) {
                            case CONTENT_RELAYING:
                                return (
                                    <RelayingComponent />
                                );
                            case CONTENT_TUNNELING:
                                return (
                                    <TunnelingComponent />
                                );
                            default:
                                return (
                                    <div>Empty.</div>
                                );
                            }
                        })() }
                    </div>
                </div>
            </MuiThemeProvider>
        );

    }

}

ReactDOM.render(<App />, document.getElementById('root'));
