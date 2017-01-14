
import React, { Component } from 'react';
import { Paper } from 'material-ui';

export default class AboutComponent extends Component {

    constructor(props) {
        super(props);

    }

    render() {
        return (
            <Paper style={{
                padding: 16,
            }}>
                <h1>关于</h1>
            </Paper>
        );
    }

}
