var crypto = require('crypto');
var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, configs) {
    var cruntime = new Config();

    cruntime.set('server', [ ]);
    cruntime.set('ca.crt', null);
    cruntime.set('ssl.key', null);
    cruntime.set('fields.deploy_env', names.get('environment'));
    cruntime.set('fields.deploy_service', names.get('service'));
    cruntime.set('fields.deploy_role', names.get('role'));

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime.config;
}
