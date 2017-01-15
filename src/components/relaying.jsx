
const { clipboard } = require('electron');

import React, { Component } from 'react';
import { Paper, SelectField, MenuItem, TextField, RaisedButton, IconButton, CircularProgress } from 'material-ui';
import IconContentCopy from 'material-ui/svg-icons/content/content-copy';

const phantom = require('../phantom');

export default class RelayingComponent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            wareUpdating: false,
            wareInfos: [],
            relayBooting: false,
            relayInfo: {
                address: '',
                port: -1,
                deltas: [],
                delta: -1,
            },
            wareSelected: 'auto',
        };

    }

    componentDidMount() {

        phantom.on('relayUpdate', (relayInfo) => {
            this.setState({
                relayInfo,
            });
        });

        this.updateWares();

    }

    updateWares() {

        this.setState({
            wareUpdating: true,
        });

        return phantom.updateWares()
        .then((wareInfos) => {

            this.setState({
                wareUpdating: false,
                wareInfos,
            });

        })
        .catch((err) => {

            console.error(err);

            this.setState({
                wareUpdating: false,
            });

        });

    }

    startRelay() {

        this.setState({
            relayBooting: true,
        });

        return phantom.startRelay(this.state.wareSelected != 'auto' ? this.state.wareSelected : null)
        .then((relayInfo) => {

            this.setState({
                relayBooting: false,
                relayInfo,
            });

        })
        .catch((err) => {

            console.error(err);

            this.setState({
                relayBooting: false,
            });

        });

    }

    onWareChange(event, index, value) {
        this.setState({
            wareSelected: value,
        });
    }

    onUpdateClick() {
        this.updateWares();
    }

    onRelayClick() {
        this.startRelay();
    }

    onCopyClick() {

        const address = `${ this.state.relayInfo.address }:${ this.state.relayInfo.port }`;

        clipboard.writeText(address);

        alert(`「${ address }」已经复制到剪贴板。`);

    }

    render() {

        const wareItems = this.state.wareInfos.map((wareInfo, idx) => {
            return (
                <MenuItem key={ idx } primaryText={ `${ wareInfo.address } - ${ wareInfo.delta }ms` } value={ wareInfo.name } />
            );
        })

        return (
            <Paper style={{
                padding: 16,
            }}>
                <div>
                    <SelectField floatingLabelText="中转服务器" value={ this.state.wareSelected } floatingLabelFixed={ true } onChange={ this.onWareChange.bind(this) }>
                        <MenuItem primaryText="自动选择" value="auto" />
                        { wareItems }
                    </SelectField>
                    <div>
                        {
                            this.state.wareUpdating
                            ? <CircularProgress />
                            : <RaisedButton onTouchTap={ this.onUpdateClick.bind(this) }>刷新</RaisedButton>
                        }
                    </div>
                </div>
                <div>
                    <div>
                        <div style={{
                            position: 'absolute',
                            zIndex: 1,
                            left: 232,
                        }}>
                            <IconButton onTouchTap={ this.onCopyClick.bind(this) }>
                                <IconContentCopy />
                            </IconButton>
                        </div>
                        <TextField hintText="点击「中转」获取中转地址" value={ `${ this.state.relayInfo.address }:${ this.state.relayInfo.port }` } disabled={ true } />
                    </div>
                    <div>
                        {
                            this.state.relayBooting
                            ? <CircularProgress />
                            : <RaisedButton onTouchTap={ this.onRelayClick.bind(this) }>中转</RaisedButton>
                        }
                    </div>
                </div>
            </Paper>
        );
    }

}
