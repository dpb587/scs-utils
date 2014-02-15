var util = require('util');
var ConfigBase = require('../../../../../../config/config');

// --

function Config() {
    ConfigBase.apply(this, arguments);
}

util.inherits(Config, ConfigBase);

// --

module.exports = Config;
