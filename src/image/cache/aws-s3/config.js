var util = require('util');
var Config = require('../../../config/config');

// --

function CacheConfig() {
    Config.apply(this, arguments);
}

util.inherits(CacheConfig, Config);

CacheConfig.prototype.setDefaults = function () {
    //this.set('bucket', null);
    this.set('prefix', '');
}

// --

module.exports = CacheConfig;
