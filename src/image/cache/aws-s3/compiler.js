var Config = require('../../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (configs) {
    var cruntime = new Config();

    cruntime.set('api.region', null);
    cruntime.set('api.access_key_id', null);
    cruntime.set('api.secret_access_key', null);
    cruntime.set('api.session_token', null);

    cruntime.set('bucket', null);
    cruntime.set('prefix', '');
    cruntime.set('acl', 'private');

    configs.forEach(function (config) {
        cruntime.importObject(config);
    });

    return cruntime.config;
}
