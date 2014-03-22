var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var utilfs = require('../../../../../../util/fs');

// --

function Volume(id, cimage, ccontainer, logger) {
    this.id = id;
    this.cimage = cimage;
    this.ccontainer = ccontainer;
    this.logger = logger;
}

Volume.prototype.getRealPath = function (container) {
    return path.resolve(
        container.env.getVolume(this.ccontainer.get('volume')),
        this.ccontainer.get('path')
    );
}

Volume.prototype.onContainerLoad = function (steps, callback, container) {
    var p = this.getRealPath(container);

    if (!fs.existsSync(p)) {
        if (true !== this.ccontainer.get('autocreate')) {
            throw new Error('The path "' + p + '" does not exist.');
        }

        utilfs.mkdirRecursiveSync(p, this.ccontainer.get('mode'));
    }

    container.env.setVolume(this.id, p);

    callback();
}

Volume.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Volume.prototype.onContainerStarted = function (steps, callback, container) {
    callback();
}

Volume.prototype.onContainerStopped = function (steps, callback, container) {
    callback();
}

Volume.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Volume.prototype.onContainerUnload = function (steps, callback, container) {
    if (true === this.ccontainer.get('autopurge')) {
        fs.rmdirSync(this.getRealPath(container));
    }

    callback();
};

// --

module.exports = Volume;
