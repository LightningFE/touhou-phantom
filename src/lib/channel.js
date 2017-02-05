
const { EventEmitter } = require('events');

class Channel extends EventEmitter {

    constructor(channel) {
        super();

        this.channel = channel;

        this.channel.onmessage = (event) => {

            const { name, payload } = JSON.parse(event.data);

            this.emit(name, payload);

        };

    }

    send(name, payload) {

        this.channel.send(JSON.stringify({
            name, payload,
        }));

    }

}

module.exports = Channel;
