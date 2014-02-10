var util = require('util');
var Config = require('../../../config/config');

// --

function SourceConfig() {
    Config.apply(this, arguments);
}

util.inherits(SourceConfig, Config);

// --

module.exports = SourceConfig;
