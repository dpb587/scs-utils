var util = require('util');
var Config = require('./config');

// --

function Compiled() {
    Config.apply(this, arguments);
}

util.inherits(Compiled, Config);

// --

module.exports = Compiled;
