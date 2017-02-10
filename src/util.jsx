

import React, { Component } from 'react';
import { Dialog, Snackbar, RaisedButton } from 'material-ui';

const { EventEmitter } = require('events');
const { randomBytes } = require('crypto');

export function alertEx(message) {
    return new Promise((resolve, reject) => {

        const id = randomBytes(8).toString('utf-8');

        emitter.emit('dialog', {
            id: id,
            title: 'Phantom',
            message: message,
            buttons: [ '确定' ],
            cancelId: 0,
        });

        emitter.once(id, r => resolve(r == 0));

    });
}

export function confirmEx(message) {
    return new Promise((resolve, reject) => {

        const id = randomBytes(8).toString('utf-8');

        emitter.emit('dialog', {
            id: id,
            title: 'Phantom',
            message: message,
            buttons: [ '是', '否' ],
            cancelId: 1,
        });

        emitter.once(id, r => resolve(r == 0));

    });
}

const emitter = new EventEmitter();

function MessageDialog(props) {

    const { id, open, title, message, buttons, cancelId, onResponse } = props;

    const actions = buttons.map((button, idx) => {
        return (
            <RaisedButton onTouchTap={ () => onResponse(idx) } style={{
                margin: 8,
            }}>{ button }</RaisedButton>
        );
    });

    return (
        <Dialog title={ title } open={ open } actions={ actions } onRequestClose={ () => onResponse(cancelId) }>
            { message }
        </Dialog>
    );

}

export class PhantomHelper extends Component {

    constructor(props) {
        super(props);

        this.state = {
            dialog: {
                open: false,
                id: '',
                title: '',
                message: '',
                buttons: [],
                cancelId: 0,
            },
        };

        emitter.on('dialog', ({
            id, title, message, buttons, cancelId,
        }) => {
            this.showDialog({
                id, title, message, buttons, cancelId,
            });
        });

    }

    showDialog({
        id, title, message, buttons, cancelId,
    }) {
        this.setState({
            dialog: {
                open: true,
                id, title, message, buttons, cancelId,
            },
        });
    }

    resetDialog() {
        this.setState({
            dialog: {
                open: false,
                id: '',
                title: '',
                message: '',
                buttons: [],
                cancelId: 0,
            },
        });
    }

    onResponse(response) {

        const { id } = this.state.dialog;

        emitter.emit(id, response);

        this.resetDialog();

    }

    render() {

        return (
            <div>
                <MessageDialog { ...this.state.dialog } onResponse={ this.onResponse.bind(this) } />
            </div>
        );
    }

}
