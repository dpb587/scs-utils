var util = require('util');
var ConfigBase = require('../../../../../../config/config');

// --

function Config() {
    ConfigBase.apply(this, arguments);
}

util.inherits(Config, ConfigBase);

Config.prototype.setDefaults = function () {
    this.set('server', '127.0.0.1:9640');
}

// --

module.exports = Config;
