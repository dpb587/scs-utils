var util = require('util');
var Config = require('../../../config/config');

// --

function EngineConfig() {
    Config.apply(this, arguments);
}

util.inherits(EngineConfig, Config);

EngineConfig.prototype.setDefaults = function () {
    //this.set('bucket', null);
    this.set('build_patch.pre', []);
    this.set('build_patch.post', []);
}

// --

module.exports = EngineConfig;
