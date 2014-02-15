var child_process = require('child_process');
var fs = require('fs');

// --

function Volume(profile, id, config, logger) {
    this.profile = profile;
    this.id = id;
    this.config = config;
    this.logger = logger;

    this.config.log(this.logger, 'silly', 'container/volume/' + this.id + '/config');
}

Volume.prototype.onContainerLoad = function (steps, callback, container) {
    if (!fs.existsSync(this.config.get('path'))) {
        fs.mkdirSync(this.config.get('path'), this.config.get('mode', 0700));
    }

    container.setVolume(this.id, this.config.get('path'));

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
    if (true === this.config.get('purge')) {
        fs.rmdirSync(this.config.get('path'));
    }

    callback();
};

// --

module.exports = Volume;
