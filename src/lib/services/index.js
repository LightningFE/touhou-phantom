
const EchoService = require('./echo');
const TH123Service = require('./th123');

const { views, viewLookup } = require('./views');

const exports = {
    EchoService, TH123Service,
    echo: EchoService,
    th123: TH123Service,
    services: [
        {
            name: 'echo',
            Service: EchoService,
        },
        {
            name: 'th123',
            Service: TH123Service,
        },
    ],
    serviceLookup: (name) => {
        return exports.services.filter(service => name == service.name).shift();
    },
    serviceViews: views,
    serviceViewLookup: viewLookup,
};

module.exports = exports;
