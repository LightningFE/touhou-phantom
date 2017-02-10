
import React, { Component } from 'react';
import { Card, CardHeader, CardText, CardActions, TextField, RaisedButton } from 'material-ui';

class TH123ServiceView extends Component {

    constructor(props) {
        super(props);

    }

    render() {

        const { tunnelInfo, stateIcon, onCopyData } = this.props;

        return (
            <Card>
                <CardHeader title={ tunnelInfo.serviceName } subtitle={ tunnelInfo.id } avatar={ stateIcon } />
                {
                    tunnelInfo.role == 'source'
                    ? <div>
                        <CardText>
                            <TextField floatingLabelText="使用此地址连接主机" value={ tunnelInfo.data ? tunnelInfo.data.address : '' } inputStyle={{
                                backgroundImage: `url(${ require('../../../images/ic_content_copy_black_24px.svg') })`,
                                backgroundRepeat: 'no-repeat',
                                backgroundAttachment: 'scroll',
                                backgroundPosition: '98% 50%',
                            }} fullWidth={ true } onTouchTap={ () => onCopyData(tunnelInfo.data ? tunnelInfo.data.address : '') } />
                        </CardText>
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
