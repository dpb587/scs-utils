var crypto = require('crypto');
var Config = require('./config');

// --

module.exports = {};

module.exports.requiresRecompilation = function (cruntime, ccompiled) {
    
}

module.exports.bootstrapCompileConfig = function (config) {
    var oconfig = new Config();

    oconfig.set('idents', module.exports.bootstrapIdents(config.name));
    oconfig.set('source', module.exports.bootstrapSourceConfig(config.source));
    oconfig.set('image', module.exports.bootstrapImageConfig(oconfig.get('idents'), config.image));

    return oconfig.config;
}

module.exports.bootstrapImageConfig = function (idents, config) {
    var oconfig = new Config();

    oconfig.set('engine', module.exports.bootstrapImageEngineConfig(idents, config.engine));
    oconfig.set('cache', module.exports.bootstrapImageCacheConfig(idents, config.cache));

    return oconfig.config;
}

module.exports.bootstrapIdents = function (config) {
    var oconfig = new Config();

    if (!('environment' in config)) {
        throw new Error('Configuration is missing name.environment');
    } else if (!('service' in config)) {
        throw new Error('Configuration is missing name.service');
    } else if (!('role' in config)) {
        throw new Error('Configuration is missing name.role');
    }
    
    oconfig.set('environment', config.environment);
    oconfig.set('service', config.service);
    oconfig.set('role', config.role);

    if ('dev' in config) {
        oconfig.set('dev', config.dev)
    } else {
        oconfig.set('dev', false);
    }

    if ('local' in config) {
        oconfig.set('local', config.local)
    } else {
        oconfig.set('local', oconfig.get('environment') + '-' + oconfig.get('service') + '-' + oconfig.get('role'));
    }

    return oconfig.config;
}

module.exports.bootstrapSourceConfig = function (config) {
    var method = config.method;
    delete config.method;
    
    var mcompiler = require('../image/source/' + method + '/compiler');

    var oconfig = mcompiler.compileRuntimeConfig([ config ]);

    return {
        method : method,
        options : oconfig.config
    }
}

module.exports.bootstrapImageEngineConfig = function (idents, config) {
    var mcompiler = require('../image/engine/' + config.method + '/compiler');

    var oconfig = mcompiler.compileRuntimeConfig(idents, [ 'options' in config ? config.options : {} ]);

    return {
        method : config.method,
        options : oconfig.config
    };
}

module.exports.bootstrapImageCacheConfig = function (idents, config) {
    var mcompiler = require('../image/cache/' + config.method + '/compiler');

    var oconfig = mcompiler.compileRuntimeConfig(idents, [ 'options' in config ? config.options : {} ]);

    return {
        method : config.method,
        options : oconfig.config
    };
}
