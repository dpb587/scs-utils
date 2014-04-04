var child_process = require('child_process');
var util = require('util');

// --

function Requirement(id, cimage, ccontainer, logger) {
    this.id = id;
    this.cimage = cimage;
    this.ccontainer = ccontainer;
    this.logger = logger;
}

// --

Requirement.prototype.onContainerLoad = function (steps, callback, container) {
    var raw = this.ccontainer.get('endpoints', {});
    var endpoints = [];

    Object.keys(raw).forEach(function (key) {
        endpoints.push(raw[key]);
    });

    container.env.setVariable(
        'SCS_REQUIRE_' + this.id.toUpperCase(),
        endpoints.join(';')
    );

    callback();
}

Requirement.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Requirement.prototype.onContainerStarted = function (steps, callback, container) {
    callback();
}

Requirement.prototype.onContainerStopped = function (steps, callback, container) {
    callback();
}

Requirement.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Requirement.prototype.onContainerUnload = function (steps, callback, container) {
    callback();
};

// --

module.exports = Requirement;
