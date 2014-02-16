var Config = require('../../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, id, configs) {
    var cruntime = new Config();

    cruntime.set('autocreate', true);
    cruntime.set('autopurge', false);
    cruntime.set('mode', '0700');
    cruntime.set('path', '/tmp/scs-' + names.get('local'));

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime.config;
}
