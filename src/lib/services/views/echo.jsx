
import React, { Component } from 'react';
import { Card, CardHeader, CardText, CardActions } from 'material-ui';

class EchoServiceView extends Component {

    constructor(props) {
        super(props);

    }

    render() {

        const { tunnelInfo, stateIcon, onCopyData } = this.props;

        return (
            <Card initiallyExpanded={ true }>
                <CardHeader title={ tunnelInfo.serviceName } subtitle={ tunnelInfo.id } avatar={ stateIcon } actAsExpander={ true } showExpandableButton={ true } />
            </Card>
        );
    }

}

module.exports = EchoServiceView;
