
import React, { Component } from 'react';
import { Paper, Card, CardHeader, CardText, CardActions, List, ListItem, Subheader, IconMenu, MenuItem, Avatar, TextField, RaisedButton, IconButton } from 'material-ui';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

const moment = require('moment');

const phantom = require('../phantom');

class ChatView extends Component {

    constructor(props) {
        super(props);

        this.state = {
            messages: [],
        };

        this.onMessage = this.onMessage.bind(this);

    }

    componentDidMount() {

        phantom.on('userMessage', this.onMessage);

    }

    componentWillUnmount() {

        phantom.removeListener('userMessage', this.onMessage);

    }

    onMessage({
        sender, time, message,
    }) {
        this.setState({
            messages: [...this.state.messages, { sender, time, message }],
        });
    }

    onInputKeyDown(event) {

        if(event.key != 'Enter') {
            return;
        }

        phantom.api.newMessage(event.target.value);

        event.target.value = '';

    }

    render() {
        return (
            <Paper style={{
                padding: 16,
            }}>
                <div>
                    {
                        this.state.messages.map(({
                            sender, time, message,
                        }) => {
                            return (
                                <p><span>[{ moment(time).format('HH:mm:ss') }]</span> <span>{ sender.nickname }</span>#<span>{ sender.id }</span>: <span>{ message }</span></p>
                            );
                        })
                    }
                </div>
                <TextField hintText="按下「回车」发送消息" fullWidth={ true } onKeyDown={ this.onInputKeyDown.bind(this) } />
            </Paper>
        );
    }

}

class UsersView extends Component {

    constructor(props) {
        super(props);

        this.state = {
            clients: [],
        };

    }

    componentDidMount() {

        phantom.api.getClients()
        .then(({
            err, clients,
        }) => {
            this.setState({
                clients,
            });
        });

    }

    render() {
        return (
            <Paper>
                <List>
                    <Subheader>在线人数：{ this.state.clients.length }</Subheader>
                    {
                        this.state.clients.map(({
                            id, nickname,
                        }, idx) => {
                            return (
                                <ListItem key={ idx } primaryText={ nickname } secondaryText={ id } leftAvatar={
                                    <Avatar src={ require('../images/avatar.jpg') } />
                                } />
                            );
                        })
                    }
                </List>
            </Paper>
        );
    }

}

export default class SquareComponent extends Component {

    constructor(props) {
        super(props);

        this.state = {
            content: <ChatView />,
        };

    }

    setContent(content) {
        this.setState({
            content,
        });
    }

    render() {

        const nickname = phantom.settings.get('nickname');

        const content = this.state.content;

        return (
            <Paper>
                <List>
                    <ListItem primaryText={ nickname ? nickname : 'NONAME' } secondaryText={ phantom.id } leftAvatar={
                        <Avatar src={ require('../images/avatar.jpg') } />
                    } rightIconButton={
                        <IconMenu iconButtonElement={
                            <IconButton>
                                <MoreVertIcon />
                            </IconButton>
                        }>
                            <MenuItem primaryText="在线用户" onTouchTap={ () => this.setContent(<UsersView />) } />
                            <MenuItem primaryText="聊天" onTouchTap={ () => this.setContent(<ChatView />) } />
                        </IconMenu>
                    } />
                </List>
                <div>
                    { content ? content : null }
                </div>
            </Paper>
        );
    }

}
