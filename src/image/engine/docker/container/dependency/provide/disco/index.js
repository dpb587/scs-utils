var child_process = require('child_process');
var util = require('util');

var DiscoDependencyBase = require('../../../../../common/container/dependency/common/disco');

// --

function Provision(id, cimage, ccontainer, logger) {
    this.id = id;
    this.cimage = cimage;
    this.ccontainer = ccontainer;
    this.logger = logger;

    DiscoDependencyBase.call(this);
}

util.inherits(Provision, DiscoDependencyBase);

// --

Provision.prototype.onContainerLoad = function (steps, callback, container) {
    container.env.setExposedPort(
        this.id,
        this.cimage.get('protocol'),
        this.cimage.get('port')
    );

    callback();
}

Provision.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerStarted = function (steps, callback, container) {
    var that = this;

    child_process.exec(
        'docker port ' + container.dockerContainerId + ' ' + this.cimage.get('port') + '/' + this.cimage.get('protocol'),
        function (error, stdout, stderr) {
            if (error) {
                callback(error);

                return;
            }

            var split = stdout.trim().split(':');

            that.discoId = that.getDiscoClient(container).addProvision(
                that.id,
                {
                    address : ('0.0.0.0' == split[0]) ? container.env.getNetworkExternal().address : split[0],
                    port : split[1]
                },
                {
                    environment : that.ccontainer.get('name.environment'),
                    service : that.ccontainer.get('name.service'),
                    role : that.ccontainer.get('name.role'),
                    attributes : that.ccontainer.get('attributes')
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
