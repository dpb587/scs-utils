var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (id, configs) {
    var cimage = new Config();

    cimage.set('description', null);
    cimage.set('liveupdate.command', null);
    cimage.set('liveupdate.method', 'default');

    configs.forEach(function (config) {
        cimage.importObject(config);
    });

    return cimage.config;
}
