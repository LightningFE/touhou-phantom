
const EchoServiceView = require('./echo');
const TH123ServiceView = require('./th123');

const exports = {
    EchoServiceView, TH123ServiceView,
    echo: EchoServiceView,
    th123: TH123ServiceView,
    views: [
        {
            name: 'echo',
            View: EchoServiceView,
        },
        {
            name: 'th123',
            View: TH123ServiceView,
        },
    ],
    viewLookup: (name) => {
        return exports.views.filter(view => name == view.name).shift();
    }
};

module.exports = exports;
