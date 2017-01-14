
const { clipboard } = require('electron');

import React, { Component } from 'react';
import { Paper, List, ListItem, TextField, RaisedButton, CircularProgress } from 'material-ui';
import IconLink from 'material-ui/svg-icons/content/link';
import IconDone from 'material-ui/svg-icons/action/done';
import IconError from 'material-ui/svg-icons/alert/error';
import IconFace from 'material-ui/svg-icons/action/face';
import IconWifiTethering from 'material-ui/svg-icons/device/wifi-tethering';
import IconContentCopy from 'material-ui/svg-icons/content/content-copy';

const phantom = require('../phantom');

export default class TunnelingComponent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            tunnelInfos: [],
            peerId: '',
            tunnelBooting: false,
        };

    }

    componentDidMount() {

        this.setState({
            tunnelInfos: phantom.tunnelInfos,
        });

        phantom.on('tunnelStateChanged', (tunnelInfos) => {
            this.setState({
                tunnelInfos,
            });
        });

    }

    copyAddress(address) {

        if(address) {

            clipboard.writeText(address);

            alert(`「${ address }」已经复制到剪贴板。`);

        }
        else {

            alert(`Nothing is copied.`);

        }

    }

    onPeerIdChange(event, value) {
        this.setState({
            peerId: value,
        });
    }

    onConnectClick() {

        this.setState({
            tunnelBooting: true,
        });

        phantom.startTunnel(this.state.peerId)
        .then((accept) => {

            this.setState({
                tunnelBooting: false,
            });

            alert(`${ accept ? 'Accepted' : 'Denied' }.`);

        });

    }

    render() {

        const tunnelItems = this.state.tunnelInfos.map((tunnelInfo, idx) => {

            let stateIcon = null;

            switch(tunnelInfo.state) {
            case Symbol.for('TUNNEL_STATE_STARTED'):
                stateIcon = (
                    <CircularProgress mode="determinate" value={ 0 } />
                );
                break;
            case Symbol.for('TUNNEL_STATE_CHECKING'):
                stateIcon = (
                    <CircularProgress mode="determinate" value={ 25 } />
                );
                break;
            case Symbol.for('TUNNEL_STATE_CONNECTED'):
            case Symbol.for('TUNNEL_STATE_DONE'):
                stateIcon = (
                    <IconDone />
                );
                break;
            case Symbol.for('TUNNEL_STATE_DISCONNECTED'):
                stateIcon = (
                    <IconError />
                );
                break;
            }

            const nestedItems = [
                <ListItem primaryText={ tunnelInfo.peerId } leftIcon={ <IconFace /> } />,
            ];

            if(tunnelInfo.role == 'source') {
                nestedItems.push(
                    <ListItem primaryText={ tunnelInfo.localAddress } leftIcon={ <IconWifiTethering /> } rightIcon={ <IconContentCopy /> } onTouchTap={ this.copyAddress.bind(this, tunnelInfo.localAddress) } />
                );
            }

            return (
                <ListItem key={ idx } primaryText={ tunnelInfo.identity } primaryTogglesNestedList={ true } leftIcon={ <IconLink /> } rightIcon={ stateIcon } nestedItems={ nestedItems } />
            );
        });

        return (
            <Paper style={{
                padding: 16,
            }}>
                <List>
                    { tunnelItems }
                </List>
                <div>
                    <TextField hintText="PeerId" onChange={ this.onPeerIdChange.bind(this) } /><br />
                    <div>
                        {
                            this.state.tunnelBooting
                            ? <CircularProgress />
                            : <RaisedButton onTouchTap={ this.onConnectClick.bind(this) }>连接</RaisedButton>
                        }
                    </div>
                </div>
            </Paper>
        );
    }

}
