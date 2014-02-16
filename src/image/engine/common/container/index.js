var events = require('events');
var util = require('util');

var ContainerEnvironment = require('./environment');
var ContainerWorkflow = require('./workflow');
var Config = require('../../../../util/config');

// --

function Container(id, cimage, ccontainer, logger) {
    this.id = id;
    this.cimage = cimage;
    this.ccontainer = ccontainer;
    this.logger = logger;

    this.storage = {};

    this.runtimeDependencyProvide = {};
    this.runtimeDependencyRequire = {};
    this.runtimeDependencyVolume = {};
    this.runtimeNetwork = null;

    this.env = new ContainerEnvironment();
    this.workflow = new ContainerWorkflow(this, this.logger);
}

util.inherits(Container, events.EventEmitter);

// --

Container.prototype.store = function (key, value) {
    this.storage[key] = value;
}

Container.prototype.retrieve = function (key, defaultCallback) {
    if (!(key in this.storage)) {
        this.store(key, defaultCallback());
    }

    return this.storage[key];
}

// --

Container.prototype.stop = function (callback) {
    this.workflow.stop(
        this.engineStop.bind(this),
        callback
    );
}

Container.prototype.start = function (callback) {
    this.workflow.start(
        this.engineStart.bind(this),
        callback
    );
}

// --

Container.prototype.getRuntimeDependencyRequire = function (key) {
    if (!(key in this.runtimeDependencyRequire)) {
        var mtype = require('../../' + this.cimage.get('engine._method') + '/container/dependency/require/' + this.ccontainer.get('dependency.require.' + key + '._method'));

        this.runtimeDependencyRequire[key] = new mtype(
            key,
            new Config(this.cimage.get('dependency.require.' + key)),
            new Config(this.ccontainer.get('dependency.require.' + key)),
            this.logger
        );
    }

    return this.runtimeDependencyRequire[key];
}

Container.prototype.getRuntimeDependencyProvide = function (key) {
    if (!(key in this.runtimeDependencyProvide)) {
        var mtype = require('../../' + this.cimage.get('engine._method') + '/container/dependency/provide/' + this.ccontainer.get('dependency.provide.' + key + '._method'));

        this.runtimeDependencyProvide[key] = new mtype(
            key,
            new Config(this.cimage.get('dependency.provide.' + key)),
            new Config(this.ccontainer.get('dependency.provide.' + key)),
            this.logger
        );
    }

    return this.runtimeDependencyProvide[key];
}

Container.prototype.getRuntimeDependencyVolume = function (key) {
    if (!(key in this.runtimeDependencyVolume)) {
        var mtype = require('../../' + this.cimage.get('engine._method') + '/container/dependency/volume/' + this.ccontainer.get('dependency.volume.' + key + '._method'));

        this.runtimeDependencyVolume[key] = new mtype(
            key,
            new Config(this.cimage.get('dependency.volume.' + key)),
            new Config(this.ccontainer.get('dependency.volume.' + key)),
            this.logger
        );
    }

    return this.runtimeDependencyVolume[key];
}

Container.prototype.getRuntimeNetwork = function () {
    if (null == this.runtimeNetwork) {
        var mtype = require('../../' + this.cimage.get('engine._method') + '/container/network/' + this.ccontainer.get('network._method'));

        this.runtimeNetwork = new mtype(
            new Config(this.ccontainer.get('network')),
            this.logger
        );
    }

    return this.runtimeNetwork;
}

// --

module.exports = Container;
