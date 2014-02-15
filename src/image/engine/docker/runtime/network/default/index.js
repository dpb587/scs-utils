var child_process = require('child_process');

// --

function Network(profile, config, logger) {
    this.profile = profile;
    this.config = config;
    this.logger = logger;

    this.config.log(this.logger, 'silly', 'container/network/config');
}

Network.prototype.onContainerLoad = function (steps, callback, container) {
    child_process.exec(
        'hostname -I | awk \'{ print $1 }\'',
        function (error, stdout, stderr) {
            if (error) {
                callback(error);

                return;
            }

            container.setNetworkPublicAddress(stdout.trim());

            callback();
        }
    );
}

Network.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Network.prototype.onContainerStarted = function (steps, callback, container) {
    callback();
}

Network.prototype.onContainerStopped = function (steps, callback, container) {
    callback();
}

Network.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Network.prototype.onContainerUnload = function (steps, callback, container) {
    callback();
};

// --

module.exports = Network;
