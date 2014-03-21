var child_process = require('child_process');
var fs = require('fs');
var utilfs = require('../../../../../../util/fs');
var path = require('path');

// --

function Volume(id, cimage, cruntime, logger) {
    this.id = id;
    this.cimage = cimage;
    this.cruntime = cruntime;
    this.logger = logger;
}

Volume.prototype.getRealPath = function (container) {
    return path.resolve(
        container.env.getVolume(this.cruntime.get('volume')),
        this.cruntime.get('path')
    );
}

Volume.prototype.onContainerLoad = function (steps, callback, container) {
    if (!fs.existsSync(this.getRealPath(container))) {
        if (true !== this.cruntime.get('autocreate')) {
            throw new Error('The path "' + this.getRealPath(container) + '" does not exist.');
        }

        utilfs.mkdirRecursiveSync(this.getRealPath(container), this.cruntime.get('mode'));
    }

    container.env.setVolume(this.id, this.getRealPath(container));

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
    if (true === this.cruntime.get('autopurge')) {
        fs.rmdirSync(this.getRealPath(container));
    }

    callback();
};

// --

module.exports = Volume;
