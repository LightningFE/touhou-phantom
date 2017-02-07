
const { EventEmitter } = require('events');

const msgpack = require('msgpack-lite');

class Channel extends EventEmitter {

    constructor(channel) {
        super();

        this.channel = channel;
        this.channel.binaryType = 'arraybuffer';

        this.channel.onmessage = (event) => {

            const { name, payload } = msgpack.decode(Buffer.from(event.data));

            this.emit(name, payload);

        };

    }

    send(name, payload) {

        this.channel.send(msgpack.encode({
            name, payload,
        }));

    }

}

module.exports = Channel;
