var crypto = require('crypto');
var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var cruntime = new Config();

    cruntime.set('binary.git', 'git');

    cruntime.set('uri', null);
    cruntime.set('reference', 'master');

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime.config;
}
