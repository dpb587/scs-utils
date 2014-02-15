var util = require('util');
var Config = require('./config');

// --

function Core() {
    Config.apply(this, arguments);
}

util.inherits(Core, Config);

Core.prototype.setDefaults = function () {
    this.set('image.engine._default_', 'docker');
    this.set('image.source._default_', 'git');
    this.set('runtime.network._default_', 'default');
    this.set('image.cache._default_', 'disabled');
}

// --

module.exports = Core;
