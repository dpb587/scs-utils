var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, id, configs) {
    var ccontainer = new Config();

    ccontainer.set('volume', null);

    ccontainer.set('autocreate', true);
    ccontainer.set('autopurge', false);
    ccontainer.set('mode', '700');
    ccontainer.set('path', id);

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    if (null == ccontainer.get('volume')) {
        throw new Error('You must specify a volume property for volume ' + id + '.');
    }

    return ccontainer.config;
}
