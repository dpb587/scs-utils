var util = require('util');
var ConfigBase = require('../../../../../../config/config');

// --

function Config() {
    ConfigBase.apply(this, arguments);
}

util.inherits(Config, ConfigBase);

Config.prototype.setDefaults = function () {
    this.set('mode', '0700');
    this.set('purge', false);
}

// --

module.exports = Config;
