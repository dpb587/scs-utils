var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, id, configs) {
    var cruntime = new Config();

    cruntime.set('server.address', '127.0.0.1');
    cruntime.set('server.port', '9640');

    cruntime.set('name.environment', names.get('environment'));
    cruntime.set('name.service', names.get('service'));
    cruntime.set('name.role', names.get('role'));
    cruntime.set('name.endpoint', id);

    cruntime.set('attributes', {});

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime.config;
}
