
import React, { Component } from 'react';
import { Card, CardHeader, CardText, CardActions, TextField, RaisedButton } from 'material-ui';

class TH123ServiceView extends Component {

    constructor(props) {
        super(props);

    }

    render() {

        const { tunnelInfo, stateIcon, onCopyData } = this.props;

        return (
            <Card initiallyExpanded={ true }>
                <CardHeader title={ tunnelInfo.serviceName } subtitle={ tunnelInfo.id } avatar={ stateIcon } actAsExpander={ true } showExpandableButton={ true } />
                {
                    tunnelInfo.role == 'source'
                    ? <CardText expandable={ true }>
                        <TextField floatingLabelText="使用此地址连接主机" value={ tunnelInfo.data ? tunnelInfo.data.address : '' } inputStyle={{
                            backgroundImage: `url(${ require('../../../images/ic_content_copy_black_24px.svg') })`,
                            backgroundRepeat: 'no-repeat',
                            backgroundAttachment: 'scroll',
                            backgroundPosition: '98% 50%',
                        }} fullWidth={ true } onTouchTap={ () => onCopyData(tunnelInfo.data ? tunnelInfo.data.address : '') } />
                    </CardText>
                    : <CardText expandable={ true }>
                        请启动游戏并在默认端口（10800）建立主机。
                    </CardText>
                }
            </Card>
        );

    }

}

module.exports = TH123ServiceView;
