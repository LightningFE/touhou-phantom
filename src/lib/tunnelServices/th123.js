
const { EventEmitter } = require('events');
const dgram = require('dgram');

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

            const channel = this.tunnel.channel;

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

                channel.send(msg.toString('base64'));

            });

            channel.onmessage = (event) => {

                console.info('channel message', event.data);

                if(event.data.indexOf('{') == 0) {

                    const data = JSON.parse(event.data);

                    switch(data.type) {
                    case 'echo':

                        channel.send(JSON.stringify({
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

            };

            const beating = () => {

                channel.send(JSON.stringify({
                    type: 'echo',
                    data: Date.now(),
                }));

            };

            channel.send(JSON.stringify({
                type: 'message',
                data: 'Hello world!',
            }));

            channel.onclose = (event) => {

                console.info('channel close');

                // TODO: Release resources.


            };

            this.emit('data', this.localAddress);

        }.bind(this))();
    }

    stop() {

    }

}

module.exports = TH123Service;
