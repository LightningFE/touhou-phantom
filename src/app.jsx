
// Import once, use everywhere.
window.Promise = require('bluebird');
window.console = require('./lib/logger');

import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { MuiThemeProvider, getMuiTheme } from 'material-ui/styles';
import { AppBar, Drawer, Paper, Menu, MenuItem, Divider, IconButton } from 'material-ui';
import IconConnected from 'material-ui/svg-icons/device/signal-cellular-4-bar';
import IconDisconnected from 'material-ui/svg-icons/device/signal-cellular-0-bar';

import { alertEx, PhantomHelper } from './util';
import SquareComponent from './components/square';
import RelayingComponent from './components/relaying';
import TunnelingComponent from './components/tunneling';
import ToolboxComponent from './components/toolbox';
import SettingsComponent from './components/settings';
import HelpComponent from './components/help';
import AboutComponent from './components/about';

const phantom = require('./phantom');

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
            content: <HelpComponent />,
            connected: false,
            id: '',
        };

    }

    componentDidMount() {

        document.title = this.title;

        console.info(phantom);

        this.setState({
            connected: phantom.connected,
            id: phantom.id,
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

        phantom.on('idChanged', (id) => {
            this.setState({
                id,
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

    render() {

        const connectionIndicator = (
            <IconButton tooltip={ this.state.connected ? '已连接' : '已断开' }>
                { this.state.connected ? <IconConnected /> : <IconDisconnected /> }
            </IconButton>
        );

        const content = this.state.content;

        return (
            <MuiThemeProvider muiTheme={ getMuiTheme({ userAgent: 'Chrome' }) }>
                <div>
                    <AppBar title={ this.title } iconElementRight={ connectionIndicator } onLeftIconButtonTouchTap={ this.toggleDrawer.bind(this) } />
                    <Drawer open={ this.state.drawerShowed } docked={ false } onRequestChange={ this.toggleDrawer.bind(this) }>
                        <AppBar title={ this.title } onLeftIconButtonTouchTap={ this.toggleDrawer.bind(this) } />
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(<SquareComponent />); } }># { this.state.id }</MenuItem>
                        <Divider />
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(<RelayingComponent />); } }>中转服务</MenuItem>
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(<TunnelingComponent />); } }>穿透服务</MenuItem>
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(<ToolboxComponent />); } }>工具箱</MenuItem>
                        <Divider />
                        <MenuItem checked={ true }>东方非想天则</MenuItem>
                        <Divider />
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(<SettingsComponent />); } }>设置</MenuItem>
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(<HelpComponent />); } }>帮助</MenuItem>
                        <MenuItem onTouchTap={ () => { this.toggleDrawer(); this.setContent(<AboutComponent />); } }>关于</MenuItem>
                    </Drawer>
                    <div style={{
                        margin: 8,
                    }}>
                        { content ? content : <div>ERROR_PAGE_NOT_FOUND</div> }
                    </div>
                    <PhantomHelper />
                </div>
            </MuiThemeProvider>
        );

    }

}

ReactDOM.render(<App />, document.getElementById('root'));
