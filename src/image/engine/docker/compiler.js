var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var cimage = new Config();

    cimage.set('from', 'scs-base');
    cimage.set('build_patch.pre', []);
    cimage.set('build_patch.post', []);

    configs.forEach(function (config) {
        cimage.importObject(config);
    });

    return cimage.config;
}


module.exports.compileContainerConfig = function (names, configs) {
    var ccontainer = new Config();

    ccontainer.set('cidfile', 'docker.cid');

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}
