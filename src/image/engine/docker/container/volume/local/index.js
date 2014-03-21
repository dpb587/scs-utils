var child_process = require('child_process');
var fs = require('fs');
var utilfs = require('../../../../../../util/fs');

// --

function Volume(id, cimage, cruntime, logger) {
    this.id = id;
    this.cimage = cimage;
    this.cruntime = cruntime;
    this.logger = logger;
}

Volume.prototype.onContainerLoad = function (steps, callback, container) {
    if (!fs.existsSync(this.cruntime.get('path'))) {
        if (true !== this.cruntime.get('autocreate')) {
            throw new Error('The path "' + this.cruntime.get('path') + '" does not exist.');
        }

        utilfs.mkdirRecursiveSync(this.cruntime.get('path'), this.cruntime.get('mode'));
    }

    container.env.setVolume(this.id, this.cruntime.get('path'));

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
        fs.rmdirSync(this.cruntime.get('path'));
    }

    callback();
};

// --

module.exports = Volume;
