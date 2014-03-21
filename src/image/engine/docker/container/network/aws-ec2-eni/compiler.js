var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, configs) {
    var ccontainer = new Config();

    ccontainer.set('host.device', 'eth1');
    ccontainer.set('container.device', 'eth1');

    ccontainer.set('network.eni', null);

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}
