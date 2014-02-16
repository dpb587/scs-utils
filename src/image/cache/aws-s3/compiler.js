var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var cruntime = new Config();

    cruntime.set('prefix', '');
    cruntime.set('access', 'private');

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime.config;
}
