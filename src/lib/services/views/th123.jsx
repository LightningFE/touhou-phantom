
import React, { Component } from 'react';
import { Card, CardHeader, CardText, CardActions, RaisedButton } from 'material-ui';

class TH123ServiceView extends Component {

    constructor(props) {
        super(props);

    }

    render() {

        const { tunnelInfo, stateIcon, onCopyData } = this.props;

        return (
            <Card>
                <CardHeader title={ tunnelInfo.serviceName } subtitle={ tunnelInfo.identity } avatar={ stateIcon } />
                {
                    tunnelInfo.role == 'source'
                    ? <div>
                        <CardText>
                            请使用此地址连接主机：<br />
                            { tunnelInfo.data ? tunnelInfo.data.address : 'UNKNOWN' }
                        </CardText>
                        <CardActions>
                            <RaisedButton onTouchTap={ () => onCopyData(tunnelInfo.data) }>复制地址</RaisedButton>
                        </CardActions>
                    </div>
                    : <div>
                        <CardText>
                            请启动游戏并在默认端口（10800）建立主机。
                        </CardText>
                    </div>
                }
            </Card>
        );

    }

}

module.exports = TH123ServiceView;
