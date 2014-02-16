var Config = require('../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var cimage = new Config();

    cimage.set('configurator.method', 'puppet');

    configs.forEach(function (config) {
        cimage.importObject(config);
    });

    return cimage;
}

module.exports.compileRuntimeConfig = function (runtime, id, configs) {
    var cruntime = new Config();

    cruntime.set('image.engine.method', 'docker');

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime;
}
