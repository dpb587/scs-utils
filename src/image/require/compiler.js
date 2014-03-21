var Config = require('../../util/config');

// --

module.exports = {};

module.exports.compileImageConfig = function (id, configs) {
    var cimage = new Config();

    cimage.set('description', null);

    cimage.set('liveupdate.enabled', null);
    cimage.set('liveupdate.method', 'default');
    cimage.set('liveupdate.command', null);
    cimage.set('liveupdate.timeout', 60);

    configs.forEach(function (config) {
        cimage.importObject(config);
    });

    cimage.set(
        'liveupdate.enabled',
        cimage.get(
            'liveupdate.enabled',
            (null !== cimage.get('liveupdate.command', null)) ? true : false
        )
    );

    return cimage.config;
}
