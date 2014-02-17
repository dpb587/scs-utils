var fs = require('fs');
var path = require('path');

// --

module.exports = {};

function mkdirRecursiveSync(pa, mode) {
    if (2 < pa.length) {
        mkdirRecursiveSync(pa.slice(0, -1), mode);
    }

    var ps = pa.join(path.sep);

    if (!fs.existsSync(ps)) {
        fs.mkdirSync(ps, mode);
    }
}

module.exports.mkdirRecursiveSync = function (p, mode) {
    mkdirRecursiveSync(path.normalize(p).split(path.sep), mode);
}
