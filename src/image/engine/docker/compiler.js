var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var cimage = new Config();

    cimage.set('from', 'ubuntu:precise');

    configs.forEach(function (config) {
        cimage.importObject(config);
    });

    return cimage.config;
}


module.exports.compileContainerConfig = function (names, configs) {
    var cruntime = new Config();

    cruntime.set('build_patch.pre', []);
    cruntime.set('build_patch.post', []);

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime.config;
}
