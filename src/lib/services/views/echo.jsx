
import React, { Component } from 'react';
import { Card, CardHeader, CardText, CardActions } from 'material-ui';

class EchoServiceView extends Component {

    constructor(props) {
        super(props);

    }

    render() {

        const { tunnelInfo, stateIcon, onCopyData } = this.props;

        return (
            <Card>
                <CardHeader title="EchoServiceView" />
            </Card>
        );
    }

}

module.exports = EchoServiceView;
