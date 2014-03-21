var Config = require('../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (id, configs) {
    var cimage = new Config();

    cimage.set('description', null);
    cimage.set('port', null);
    cimage.set('protocol', 'tcp');

    configs.forEach(function (config) {
        cimage.importObject(config);
    });

    return cimage.config;
}
