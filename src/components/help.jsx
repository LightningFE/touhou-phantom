
import React, { Component } from 'react';
import { Paper } from 'material-ui';

export default class HelpComponent extends Component {

    constructor(props) {
        super(props);

    }

    render() {
        return (
            <Paper style={{
                padding: 16,
            }}>
                <h1>帮助</h1>
                <h2>中转服务</h2>
                <div>
                    <p>中转服务通过服务器中转游戏的联机数据，为玩家提供一个可供接入对战的公网地址。</p>
                    <p>不需要双方都使用Phantom。对选择的中转服务器到对战双方的延迟有一定的要求。</p>
                </div>
                <h2>穿透服务</h2>
                <div>
                    <p>穿透服务通过服务器帮助对战双方建立连接，以获得接近直连的对战体验。</p>
                    <p>需要双方都使用Phantom。连接成功与否取决于对战双方网络环境的复杂程度。</p>
                </div>
            </Paper>
        );
    }

}
