var child_process = require('child_process');

// --

function Network (ccontainer, logger) {
    this.ccontainer = ccontainer;
    this.logger = logger;
}

Network.prototype.onContainerLoad = function (steps, callback, container) {
    child_process.exec(
        'ip -f inet -o addr show dev ' + this.ccontainer.get('interface') + ' | sed -r \'s/.*inet\\s+([^\\/]+).*/\\1/\'',
        function (error, stdout, stderr) {
            if (error) {
                callback(error);

                return;
            }

            container.env.setNetworkExternal(null, stdout.trim());

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
