var util = require('util');

var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, id, configs) {
    var ccontainer = new Config();

    ccontainer.set('autocreate', true);
    ccontainer.set('autopurge', false);
    ccontainer.set('mode', '700');
    ccontainer.set(
        'path',
        './dependency-volume-' + id
    );

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}
