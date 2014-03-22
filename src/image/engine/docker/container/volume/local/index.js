var child_process = require('child_process');
var fs = require('fs');
var utilfs = require('../../../../../../util/fs');

// --

function Volume(id, cimage, ccontainer, logger) {
    this.id = id;
    this.cimage = cimage;
    this.ccontainer = ccontainer;
    this.logger = logger;
}

Volume.prototype.onContainerLoad = function (steps, callback, container) {
    if (!fs.existsSync(this.ccontainer.get('path'))) {
        if (true !== this.ccontainer.get('autocreate')) {
            throw new Error('The path "' + this.ccontainer.get('path') + '" does not exist.');
        }

        utilfs.mkdirRecursiveSync(this.ccontainer.get('path'), this.ccontainer.get('mode'));
    }

    container.env.setVolume(this.id, this.ccontainer.get('path'));

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
        fs.rmdirSync(this.ccontainer.get('path'));
    }

    callback();
};

// --

module.exports = Volume;
