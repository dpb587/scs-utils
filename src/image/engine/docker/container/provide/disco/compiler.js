var Config = require('../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, id, configs) {
    var ccontainer = new Config();

    ccontainer.set('server.address', '127.0.0.1');
    ccontainer.set('server.port', '9640');

    ccontainer.set('name.environment', names.get('environment'));
    ccontainer.set('name.service', names.get('service'));
    ccontainer.set('name.role', names.get('role'));
    ccontainer.set('name.endpoint', id);

    ccontainer.set('attributes', {});

    ccontainer.set('publish.port', null);
    ccontainer.set('publish.address', null);
    ccontainer.set('publish.method', 'default');

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    return ccontainer.config;
}
