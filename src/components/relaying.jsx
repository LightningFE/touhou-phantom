
const { clipboard } = require('electron');

import React, { Component } from 'react';
import { Paper, SelectField, MenuItem, TextField, RaisedButton, CircularProgress } from 'material-ui';

import StatsView from './views/stats';

const phantom = require('../phantom');

export default class RelayingComponent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            wareUpdating: false,
            wareInfos: [],
            wareSelected: 'auto',
            relayBooting: false,
            relayInfo: {
                address: '',
                port: -1,
                deltas: [],
                delta: -1,
            },
        };

    }

    componentDidMount() {

        phantom.on('relayUpdate', (relayInfo) => {

            this.setState({
                relayInfo,
            });

            if(this.refs.stats) {
                this.refs.stats.update(relayInfo.delta);
            }

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
                <MenuItem key={ idx } primaryText={ `${ wareInfo.address } - ${ wareInfo.delta.toFixed(2) }ms` } value={ wareInfo.name } />
            );
        });

        const relayState = (() => {
            return this.state.relayInfo.state
            ? this.state.relayInfo.state + (
                this.state.relayInfo.state == 'GUEST_BOUND'
                ? ` ${ this.state.relayInfo.guest }`
                : ''
            )
            : null;
        })();

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
                        <TextField hintText="点击「中转」获取中转地址" errorText={ relayState }  value={ this.state.relayInfo && this.state.relayInfo.port > 0 ? `${ this.state.relayInfo.address }:${ this.state.relayInfo.port }` : '' } errorStyle={{
                            color: 'rgb(0, 188, 212)',
                        }} inputStyle={{
                            backgroundImage: `url(${ require('../images/ic_content_copy_black_24px.svg') })`,
                            backgroundRepeat: 'no-repeat',
                            backgroundAttachment: 'scroll',
                            backgroundPosition: '98% 50%',
                        }} onTouchTap={ this.state.relayInfo && this.state.relayInfo.address ? this.onCopyClick.bind(this) : null } />
                    </div>
                    <div>
                        {
                            this.state.relayBooting
                            ? <CircularProgress />
                            : <div>
                                <RaisedButton onTouchTap={ this.onRelayClick.bind(this) }>中转</RaisedButton><br />
                                <StatsView ref="stats" style={{
                                    marginTop: 8,
                                }} />
                            </div>
                        }
                    </div>
                </div>
            </Paper>
        );
    }

}
