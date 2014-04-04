var child_process = require('child_process');
var util = require('util');

// --

function Provision(id, cimage, ccontainer, logger) {
    this.id = id;
    this.cimage = cimage;
    this.ccontainer = ccontainer;
    this.logger = logger;
}

// --

Provision.prototype.onContainerLoad = function (steps, callback, container) {
    var addr = this.ccontainer.get('publish.address', null);

    container.env.setExposedPort(
        this.id,
        this.cimage.get('protocol'),
        this.cimage.get('port'),
        this.ccontainer.get('publish.port', null),
        addr ? addr : container.env.getNetworkExternal().address
    );

    callback();
}

Provision.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerStarted = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerStopped = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerUnload = function (steps, callback, container) {
    callback();
};

// --

module.exports = Provision;
