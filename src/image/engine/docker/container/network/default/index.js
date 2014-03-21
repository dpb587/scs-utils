var child_process = require('child_process');

// --

function Network (ccontainer, logger) {
    this.ccontainer = ccontainer;
    this.logger = logger;
}

Network.prototype.onContainerLoad = function (steps, callback, container) {
    var that = this;

    var cmd = 'ip -f inet -o addr show dev ' + this.ccontainer.get('host.device');

    if ('eth0' != that.ccontainer.get('container.device')) {
        cmd = '( ifdown -v ' + that.ccontainer.get('host.device') + ' || true ) && ifup -v ' + that.ccontainer.get('host.device') + ' && ' + cmd;
    }

    this.logger.verbose(
        'network/default/load/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (stdout) {
                that.logger.silly(
                    'network/default/load/stdout',
                    stdout
                );
            }

            if (stderr) {
                that.logger.silly(
                    'network/default/load/stderr',
                    stderr
                );
            }

            if (error) {
                that.logger.silly(
                    'network/default/load/exit',
                    error
                );

                callback(error);

                return;
            }

            container.env.setNetworkInternal(
                that.ccontainer.get('container.device')
            );

            var re = new RegExp(that.ccontainer.get('host.device') + '\\s+inet\\s+(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})/(\\d{1,2})\\s+');
            var m = re.exec(stdout);

            container.env.setNetworkExternal(
                that.ccontainer.get('host.device'),
                m[1],
                m[2]
            );

            callback();
        }
    );
}

Network.prototype.onContainerUp = function (steps, callback, container) {
    var that = this;

    if ('eth0' == container.env.getNetworkInternal().name) {
        callback();

        return;
    }

    var cmd = 'ifdown -v ' + container.env.getNetworkExternal().name + ' && ' + __dirname + '/../../../../../../../bin/pipework ' + container.env.getNetworkExternal().name + ' -i ' + container.env.getNetworkInternal().name + ' ' + container.dockerContainerId + ' ' + container.env.getNetworkExternal().address + '/' + container.env.getNetworkExternal().bitmask;

    this.logger.verbose(
        'network/default/pipework/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (stdout) {
                that.logger.silly(
                    'network/default/pipework/stdout',
                    stdout
                );
            }

            if (stderr) {
                that.logger.silly(
                    'network/default/pipework/stderr',
                    stderr
                );
            }

            if (error) {
                that.logger.silly(
                    'network/default/pipework/exit',
                    error
                );

                callback(error);

                return;
            }

            callback();
        }
    );
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
