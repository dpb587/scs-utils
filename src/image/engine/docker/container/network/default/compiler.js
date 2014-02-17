var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, configs) {
    var ccontainer = new Config();

    ccontainer.set('interface', 'eth0');

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}