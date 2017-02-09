
import React, { Component } from 'react';
import { Paper, List, ListItem, Divider, TextField, RaisedButton } from 'material-ui';

const phantom = require('../phantom');

export default class SettingsComponent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            nickname: '',
        };

    }

    componentDidMount() {

        this.loadSettings();

    }

    loadSettings() {

        const settings = {};

        const keys = Object.keys(this.state);

        keys.map((key) => {

            const value = phantom.settings.get(key);

            settings[key] = value;

        });

        this.setState(settings);

    }

    saveSettings() {

        const keys = Object.keys(this.state);

        keys.map((key) => {

            phantom.settings.set(key, this.state[key]);

        });

        phantom.settings.save();

    }

    onTextFieldChange(key, event) {

        const settings = {};
        settings[key] = event.target.value;

        this.setState(settings);

    }

    onResetClick() {

        this.loadSettings();

    }

    onSaveClick() {

        this.saveSettings();

    }

    render() {
        return (
            <Paper style={{
                padding: 16,
            }}>
                <TextField floatingLabelText="昵称" fullWidth={ true } value={ this.state.nickname } onChange={ this.onTextFieldChange.bind(this, 'nickname') } />
                <div>
                    <RaisedButton onTouchTap={ this.onResetClick.bind(this) }>重置</RaisedButton>
                    <RaisedButton style={{
                        float: 'right',
                    }} onTouchTap={ this.onSaveClick.bind(this) }>保存</RaisedButton>
                </div>
            </Paper>
        );
    }

}
