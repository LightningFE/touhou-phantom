
const { EventEmitter } = require('events');
const dgram = require('dgram');

const TAG = 'th123';

class TH123Service extends EventEmitter {

    constructor(tunnel) {
        super();

        this.tunnel = tunnel;

        this.dest = {
            address: '127.0.0.1',
            port: 10800,
        };

        this.localAddress = null;

    }

    start() {
        return Promise.coroutine(function*() {

            const { channel } = this.tunnel;

            const source = {
                address: null,
                port: null,
            };

            const udp = dgram.createSocket('udp4');

            yield new Promise((resolve, reject) => {
                udp.bind(0, '0.0.0.0', resolve);
            });

            console.info('udp bound');

            this.localAddress = `127.0.0.1:${ udp.address().port }`;

            udp.on('message', (msg, rinfo) => {

                if(this.role == 'source' && !source.address && !source.port) {

                    source.address = rinfo.address;
                    source.port = rinfo.port;

                }

                channel.send(TAG, msg.toString('base64'));

            });

            channel.on(TAG, (payload) => {

                console.info('channel message', payload);

                if(event.data.indexOf('{') == 0) {

                    const data = JSON.parse(payload);

                    switch(data.type) {
                    case 'echo':

                        channel.send(TAG, JSON.stringify({
                            type: 'reply',
                            data: data.data,
                        }));

                        break;
                    }

                }
                else {

                    const buf = Buffer.from(event.data, 'base64');

                    if(this.role == 'source') {

                        if(source.address && source.port) {

                            udp.send(buf, source.port, source.address);

                        }
                        else {
                            console.warn('WARN_NO_SOURCE');
                        }

                    }
                    else {

                        udp.send(buf, this.dest.port, this.dest.address);

                    }

                }

            });

            channel.send(TAG, JSON.stringify({
                type: 'message',
                data: 'Hello world!',
            }));

            this.emit('data', this.localAddress);

        }.bind(this))();
    }

    stop() {

    }

}

module.exports = TH123Service;
