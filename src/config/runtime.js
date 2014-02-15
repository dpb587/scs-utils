var util = require('util');
var Config = require('./config');

// --

function Runtime() {
    Config.apply(this, arguments);
}

util.inherits(Runtime, Config);

Runtime.prototype.setDefaults = function () {
    this.set('image.config', {});
    this.set('runtime.network.method', 'default');
}

// --

module.exports = Runtime;
