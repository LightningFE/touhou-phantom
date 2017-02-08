
import React, { Component } from 'react';
import { Paper, TextField, RaisedButton } from 'material-ui';

const { getPublicAddress, traceroute, willMappingWork, portMapping, testConnection } = require('phantom-toolbox');

export default class ToolboxComponent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            logs: [],
        };

        this.logToken = 0;

    }

    useLogger() {

        const token = ++this.logToken;

        return (log) => {
            if(token == this.logToken) {
                this.setState({
                    logs: [log, ...this.state.logs],
                });
            }
        };

    }

    onTracerouteClick() {

        const logger = this.useLogger();

        logger('开始「路由追踪」');

        traceroute('baidu.com', {}, () => {})
        .on('hop', ([idx, address, ttr]) => {
            logger(`${ idx }   ${ address }   ${ ttr } ms`);
        });

    }

    onWillMappingWorkClick() {

        const logger = this.useLogger();

        logger('开始「映射会有用吗？」');

        willMappingWork()
        .then((willWork) => {
            logger(`结果：映射${ willWork ? '应该有用' : '大概没用' }`);
        });

    }

    onPortMappingClick() {

        const logger = this.useLogger();

        logger('开始「端口映射」');

        portMapping('udp', 10800, 10800)
        .then(({
            address, port,
        }) => {
            logger(`结果：公网地址 ${ address }:${ port } 映射成功`);
        })
        .catch(logger.bind(this));

    }

    onTestConnectionClick() {

        const logger = this.useLogger();

        logger('开始「测试连接」');

        getPublicAddress()
        .then((publicAddress) => {
            return testConnection('udp', publicAddress, 10800, 10800);
        })
        .then((result) => {
            logger(`结果：${ result ? '连接成功' : '连接失败' }`);
        })
        .catch(logger.bind(this));

    }

    render() {
        return (
            <Paper style={{
                padding: 16,
            }}>
                <div>
                    <RaisedButton fullWidth={ true } onTouchTap={ this.onTracerouteClick.bind(this) }>路由追踪</RaisedButton>
                    <RaisedButton fullWidth={ true } onTouchTap={ this.onWillMappingWorkClick.bind(this) }>映射会有用吗？</RaisedButton>
                    <RaisedButton fullWidth={ true } onTouchTap={ this.onPortMappingClick.bind(this) }>端口映射</RaisedButton>
                    <RaisedButton fullWidth={ true } onTouchTap={ this.onTestConnectionClick.bind(this) }>测试公网连接</RaisedButton>
                </div>
                <TextField floatingLabelText="日志" fullWidth={ true } multiLine={ true } value={ this.state.logs.join('\r\n') } />
            </Paper>
        );
    }

}
