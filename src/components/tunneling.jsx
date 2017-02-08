
const { clipboard } = require('electron');

import React, { Component } from 'react';
import { Paper, List, ListItem, SelectField, MenuItem, TextField, RaisedButton, CircularProgress } from 'material-ui';
import IconLink from 'material-ui/svg-icons/content/link';
import IconDone from 'material-ui/svg-icons/action/done';
import IconError from 'material-ui/svg-icons/alert/error';
import IconFace from 'material-ui/svg-icons/action/face';
import IconWifiTethering from 'material-ui/svg-icons/device/wifi-tethering';
import IconContentCopy from 'material-ui/svg-icons/content/content-copy';

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

            alert(`「${ data }」已经复制到剪贴板。`);

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

            alert(`${ accept ? 'Accepted' : 'Denied' }.`);

        });

    }

    render() {

        const tunnelCards = this.state.tunnelInfos.map((tunnelInfo, idx) => {

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

            const v = serviceViewLookup(tunnelInfo.serviceName);

            if(!v) {

                console.error(new Error('ERROR_SERVICEVIEW_NOT_FOUND'));

                return null;

            }

            const { View } = v;

            return (
                <View tunnelInfo={ tunnelInfo } stateIcon={ stateIcon } onCopyData={ this.copyData.bind(this) } />
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
                    <TextField hintText="PeerId" onChange={ this.onPeerIdChange.bind(this) } /><br />
                    <SelectField floatingLabelText="服务类型" value={ this.state.serviceSelected } floatingLabelFixed={ true } onChange={ this.onServiceChange.bind(this) }>
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
