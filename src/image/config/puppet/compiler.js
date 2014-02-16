var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var cimage = new Config();

    configs.forEach(function (config) {
        cimage.importObject(config);
    });

    return cimage.config;
}
