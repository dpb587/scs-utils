var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, configs) {
    var ccontainer = new Config();

    ccontainer.set('host.device', 'eth0');
    ccontainer.set('container.device', 'eth0');

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}
