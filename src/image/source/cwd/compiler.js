var crypto = require('crypto');
var path = require('path');

var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var ccontainer = new Config();

    ccontainer.set('path', null);

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    ccontainer.set('path', path.resolve(process.cwd(), ccontainer.get('path')));

    return ccontainer.config;
}
