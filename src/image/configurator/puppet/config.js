var util = require('util');
var Config = require('../../../config/config');

// --

function ConfiguratorConfig() {
    Config.apply(this, arguments);
}

util.inherits(ConfiguratorConfig, Config);

// --

module.exports = ConfiguratorConfig;
