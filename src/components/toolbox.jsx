
import React, { Component } from 'react';
import { Paper } from 'material-ui';

export default class ToolboxComponent extends Component {

    constructor(props) {
        super(props);

    }

    render() {
        return (
            <Paper style={{
                padding: 16,
            }}>
                <h1>工具箱</h1>
            </Paper>
        );
    }

}
