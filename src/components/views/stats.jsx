
import React, { Component } from 'react';

export default class StatsView extends Component {

    constructor(props) {
        super(props);

        this.width = 256;
        this.height = 96;
        this.count = 32;
        this.offset = this.width / this.count;

        this.max = 48;

        this.fgStyle = 'rgb(0, 188, 212)';

        this.state = {
            delta: -1,
            maxDelta: -1,
        };

    }

    update(delta) {

        const maxDelta = this.max * 0.7 + delta * 0.3 + 24 - this.max;
        this.max = this.max + maxDelta;

        const height = this.height * delta / this.max;

        const canvas = this.refs.canvas;
        const ctx = canvas.getContext('2d');

        ctx.save();

        // Move original image.
        ctx.drawImage(canvas, 0, 0, this.width, this.height, - this.offset, 0, this.width, this.height);

        // Clear dirty rect.
        ctx.fillStyle = 'white';
        ctx.fillRect(this.width - this.offset, 0, this.offset, this.height);

        // Draw new rect.
        ctx.fillStyle = this.fgStyle;
        ctx.fillRect(this.width - this.offset, this.height - height, this.offset, height);

        //ctx.fillRect(0, 0, this.width, this.height);

        ctx.restore();

        this.setState({
            delta,
            maxDelta: Math.abs(maxDelta),
        });

    }

    render() {
        return (
            <div style={ this.props.style }>
                <span style={{
                    position: 'absolute',
                    zIndex: 1,
                }}>{ this.state.delta >= 0 && this.state.maxDelta >= 0 ? `${ this.state.delta } ± ${ this.state.maxDelta.toFixed(2) } ms` : '未连接' }</span>
                <canvas ref="canvas" width={ this.width } height={ this.height } style={{
                    width: this.width,
                    height: this.height,
                }}></canvas>
            </div>
        )
    }

}

