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

    this.runtimeProvide = {};
    this.runtimeRequire = {};
    this.runtimeVolume = {};
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

Container.prototype.onContainerLoad = function (workflow, callback) {
    callback();
}

Container.prototype.onContainerUnload = function (workflow, callback) {
    callback();
}

// --

Container.prototype.getRuntimeRequire = function (key) {
    if (!(key in this.runtimeRequire)) {
        var mtype = require('../../' + this.cimage.get('engine._method') + '/container/require/' + this.ccontainer.get('require.' + key + '._method'));

        this.runtimeRequire[key] = new mtype(
            key,
            new Config(this.cimage.get('require.' + key)),
            new Config(this.ccontainer.get('require.' + key)),
            this.logger
        );
    }

    return this.runtimeRequire[key];
}

Container.prototype.getRuntimeProvide = function (key) {
    if (!(key in this.runtimeProvide)) {
        var mtype = require('../../' + this.cimage.get('engine._method') + '/container/provide/' + this.ccontainer.get('provide.' + key + '._method'));

        this.runtimeProvide[key] = new mtype(
            key,
            new Config(this.cimage.get('provide.' + key)),
            new Config(this.ccontainer.get('provide.' + key)),
            this.logger
        );
    }

    return this.runtimeProvide[key];
}

Container.prototype.getRuntimeVolume = function (key) {
    if (!(key in this.runtimeVolume)) {
        var mtype = require('../../' + this.cimage.get('engine._method') + '/container/volume/' + this.ccontainer.get('volume.' + key + '._method'));

        this.runtimeVolume[key] = new mtype(
            key,
            new Config(this.cimage.get('volume.' + key, {})),
            new Config(this.ccontainer.get('volume.' + key)),
            this.logger
        );
    }

    return this.runtimeVolume[key];
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

Container.prototype.getRuntimeLogs = function () {
    if (null == this.runtimeLogs) {
        var mtype = require('../../' + this.cimage.get('engine._method') + '/container/logs/' + this.ccontainer.get('logs._method'));

        this.runtimeLogs = new mtype(
            new Config(this.ccontainer.get('logs')),
            this.logger
        );
    }

    return this.runtimeLogs;
}

// --

module.exports = Container;
