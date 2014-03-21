function Environment() {
    this.exposedPorts = {};
    this.networkInternal = {};
    this.networkExternal = {};
    this.variables = {};
    this.volumes = {};
}

// --

Environment.prototype.getAllExposedPorts = function () {
    return this.exposedPorts;
}

Environment.prototype.setExposedPort = function (name, protocol, port, publishPort, publishAddress) {
    this.exposedPorts[name] = {
        protocol : protocol,
        port : port,
        publishPort : publishPort,
        publishAddress : publishAddress
    };

    return this;
}

Environment.prototype.getExposedPort = function (name) {
    return this.exposedPorts[name];
}

// --

Environment.prototype.setNetworkInternal = function (name, address, bitmask, gateway) {
    this.networkInternal = {
        name : name,
        address : address,
        bitmask : bitmask,
        gateway : gateway
    };

    return this;
}

Environment.prototype.getNetworkInternal = function () {
    return this.networkInternal;
}

// --

Environment.prototype.setNetworkExternal = function (name, address, bitmask, gateway) {
    this.networkExternal = {
        name : name,
        address : address,
        bitmask : bitmask,
        gateway : gateway
    };

    return this;
}

Environment.prototype.getNetworkExternal = function () {
    return this.networkExternal;
}

// --

Environment.prototype.getAllVariables = function () {
    return this.variables;
}

Environment.prototype.setVariable = function (name, value) {
    this.variables[name] = value;

    return this;
}

Environment.prototype.getVariable = function (name) {
    return this.variables[name];
}

// --

Environment.prototype.getAllVolumes = function () {
    return this.volumes;
}

Environment.prototype.setVolume = function (name, path) {
    this.volumes[name] = path;

    return this;
}

Environment.prototype.getVolume = function (name) {
    return this.volumes[name];
}

// --

module.exports = Environment;
