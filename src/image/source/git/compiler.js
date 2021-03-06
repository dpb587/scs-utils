var crypto = require('crypto');
var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var ccontainer = new Config();

    ccontainer.set('binary.git', 'git');

    ccontainer.set('uri', null);
    ccontainer.set('reference', 'master');

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}
