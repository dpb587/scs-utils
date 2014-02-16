var child_process = require('child_process');
var DiscoTcpClient = require('../../../../../../disco/service/tcp/client/service');

// --

function Provision(id, cimage, cruntime, logger) {
    this.id = id;
    this.cimage = cimage;
    this.cruntime = cruntime;
    this.logger = logger;

    this.discoId = null;
}

// --

Provision.prototype.getDiscoClient = function (container) {
    var that = this;

    return container.retrieve(
        'disco_' + this.cruntime.get('server.address') + '_' + this.cruntime.get('server.port'),
        function () {
            var disco = new DiscoTcpClient(
                {
                    server : that.cruntime.get('server')
                },
                that.logger
            );

            disco.start();

            return disco;
        }
    );
}

Provision.prototype.onContainerLoad = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerStarted = function (steps, callback, container) {
    var that = this;

    child_process.exec(
        'docker port ' + container.handleId + ' ' + this.cimage.port + '/' + this.cimage.protocol),
        function (error, stdout, stderr) {
            if (error) {
                callback(error);

                return;
            }

            var split = stdout.trim().split(':');

            that.discoId = that.getDiscoClient(container).addProvision(
                that.id,
                {
                    address : ('0.0.0.0' == split[0]) ? container.getNetworkPublicAddress() : split[0],
                    port : split[1]
                },
                {
                    environment : that.cruntime.get('name.environment'),
                    service : that.cruntime.get('name.service'),
                    role : that.cruntime.get('name.role'),
                    attributes : that.cruntime.get('attributes')
                }
            );

            callback();
        }
    );
}

Provision.prototype.onContainerStopped = function (steps, callback, container) {
    this.getDiscoClient(container).dropProvision(
        this.discoId,
        5000,
        callback
    );
}

Provision.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerUnload = function (steps, callback, container) {
    this.getDiscoClient(container).stop();

    callback();
};

// --

module.exports = Provision;
