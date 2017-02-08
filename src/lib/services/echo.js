
const { EventEmitter } = require('events');

const TAG = 'echo';

class EchoService extends EventEmitter {

    constructor(tunnel) {
        super();

        this.tunnel = tunnel;

    }

    start() {
        return Promise.coroutine(function*() {

            const { channel } = this.tunnel;

            channel.on(TAG, (payload) => {

                console.info(payload);

            });

            channel.send(TAG, Buffer.from('echo'));

        }.bind(this))();
    }

    stop() {

    }

}

module.exports = EchoService;
