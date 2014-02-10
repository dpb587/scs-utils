var util = require('util');
var Config = require('./config');

// --

function Image() {
    Config.apply(this, arguments);
}

util.inherits(Image, Config);

// --

module.exports = Image;
