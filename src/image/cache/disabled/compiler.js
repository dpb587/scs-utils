var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var cruntime = new Config();

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime.config;
}
