
const bunyan = require('bunyan');

const logger = bunyan.createLogger({
    name: 'phantom',
    streams: [
        {
            level: 'debug',
            path: './phantom.log',
        },
    ]
});

module.exports = process.env.DEVEL ? console : logger;
