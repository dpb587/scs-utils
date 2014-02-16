var Config = require('../../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, id, configs) {
    var ccontainer = new Config();

    ccontainer.set('autocreate', true);
    ccontainer.set('autopurge', false);
    ccontainer.set('mode', '0700');
    ccontainer.set('path', '/var/lib/scs-utils/volume--local--' + names.get('local'));

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}
