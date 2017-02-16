
const { clipboard } = require('electron');

import React, { Component } from 'react';
import { Paper, List, ListItem, SelectField, MenuItem, TextField, RaisedButton, CircularProgress } from 'material-ui';
import IconLink from 'material-ui/svg-icons/content/link';
import IconFace from 'material-ui/svg-icons/action/face';
import IconWifiTethering from 'material-ui/svg-icons/device/wifi-tethering';
import IconContentCopy from 'material-ui/svg-icons/content/content-copy';

import { alertEx } from '../util';

const phantom = require('../phantom');

const { services, serviceViewLookup } = require('../lib/services');

export default class TunnelingComponent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            tunnelInfos: [],
            peerId: '',
            serviceSelected: null,
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

    copyData(data) {

        if(data) {

            clipboard.writeText(data);

            alertEx(`「${ data }」已经复制到剪贴板。`);

        }
        else {

            alertEx(`Nothing is copied.`);

        }

    }

    onPeerIdChange(event, value) {
        this.setState({
            peerId: value,
        });
    }

    onServiceChange(event, index, value) {
        this.setState({
            serviceSelected: value,
        });
    }


    onConnectClick() {

        this.setState({
            tunnelBooting: true,
        });

        const serviceName = this.state.serviceSelected;

        phantom.startTunnel(this.state.peerId, serviceName)
        .then((accept) => {

            this.setState({
                tunnelBooting: false,
            });

            alertEx(`${ accept ? 'Accepted' : 'Denied' }.`);

        });

    }

    render() {

        const tunnelCards = this.state.tunnelInfos.map((tunnelInfo, idx) => {

            let progressMode = null;
            let progressColor = null;
            let progressValue = null;

            switch(tunnelInfo.state) {
            case Symbol.for('TUNNEL_STATE_STARTED'):
                progressMode = 'determinate';
                progressValue = 0;
                break;
            case Symbol.for('TUNNEL_STATE_CHECKING'):
                progressMode = 'indeterminate';
                break;
            case Symbol.for('TUNNEL_STATE_CONNECTED'):
                progressMode = 'determinate';
                progressValue = 100;
                break;
            case Symbol.for('TUNNEL_STATE_DISCONNECTED'):
            case Symbol.for('TUNNEL_STATE_FAILED'):
                progressMode = 'determinate';
                progressColor = 'red';
                progressValue = 100;
                break;
            default:
                progressMode = 'indeterminate';
                progressColor = 'red';
                break;
            }

            const v = serviceViewLookup(tunnelInfo.serviceName);

            if(!v) {

                console.error(new Error('ERROR_SERVICEVIEW_NOT_FOUND'));

                return null;

            }

            const { View } = v;

            return (
                <View key={ idx } tunnelInfo={ tunnelInfo } stateIcon={
                    <CircularProgress mode={ progressMode } color={ progressColor } value={ progressValue } />
                } onCopyData={ this.copyData.bind(this) } />
            );

        });

        const serviceItems = services.map(({
            name, service,
        }, idx) => {
            return (
                <MenuItem key={ idx } primaryText={ name } value={ name } />
            );
        });

        return (
            <Paper style={{
                padding: 16,
            }}>
                <div>
                    { tunnelCards }
                </div>
                <div>
                    <TextField hintText="输入对方的ID" fullWidth={ true } onChange={ this.onPeerIdChange.bind(this) } /><br />
                    <SelectField floatingLabelText="服务类型" value={ this.state.serviceSelected } floatingLabelFixed={ true } fullWidth={ true } onChange={ this.onServiceChange.bind(this) }>
                        <MenuItem primaryText="" value={ null } />
                        { serviceItems }
                    </SelectField>
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
