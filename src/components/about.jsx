
import React, { Component } from 'react';
import { Paper } from 'material-ui';

const { remote } = require('electron');

export default class AboutComponent extends Component {

    constructor(props) {
        super(props);

    }

    openReleasesLink() {
        remote.shell.openExternal('https://github.com/ManaSource/phantom/releases');
    }

    openProjectLink() {
        remote.shell.openExternal('https://github.com/ManaSource/phantom');
    }

    openLicenseLink() {
        remote.shell.openExternal('https://github.com/ManaSource/phantom/blob/master/LICENSE');
    }

    render() {
        return (
            <Paper style={{
                padding: 16,
            }}>
                <h1>关于</h1>
                <div>
                    <p>
                        版本号：
                        <a href="javascript:;" onClick={ this.openReleasesLink.bind(this) }>{ remote.app.getVersion() }</a>
                    </p>
                    <p>
                        项目地址：
                        <a href="javascript:;" onClick={ this.openProjectLink.bind(this) }>ManaSource/phantom</a>
                    </p>
                    <p>
                        许可协议：
                        <a href="javascript:;" onClick={ this.openLicenseLink.bind(this) }>AGPL-3.0</a>
                    </p>
                </div>
            </Paper>
        );
    }

}
