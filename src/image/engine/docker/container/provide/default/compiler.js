var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, id, configs) {
    var ccontainer = new Config();

    ccontainer.set('publish.port', null);
    ccontainer.set('publish.address', null);
    ccontainer.set('publish.method', 'default');

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}
