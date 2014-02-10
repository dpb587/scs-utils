var util = require('util');
var Config = require('./config');

// --

function Runtime() {
    Config.apply(this, arguments);
}

util.inherits(Runtime, Config);

Runtime.prototype.setDefaults = function () {
    this.set('image.config', {});
    this.set('runtime.provide', {});
    this.set('runtime.provide._default_.disco.options.server', '127.0.0.1:9640');
    this.set('runtime.require', {});
    this.set('runtime.require._default_.disco.options.server', '127.0.0.1:9640');
    this.set('runtime.network', { method : 'default' });
    this.set('runtime.volume', {});
}

// --

module.exports = Runtime;
