var Workflow = require('./workflow');
var events = require('events');
var util = require('util');

// --

function createWorkflows () {
    var that = this;
    var workflows = {};

    workflows.load = new Workflow(this, this.logger, 'container/start/hook:load', [ this ]);
    workflows.up = new Workflow(this, this.logger, 'container/start/hook:up', [ this ]);
    workflows.started = new Workflow(this, this.logger, 'container/start/hook:started', [ this ]);

    workflows.stopped = new Workflow(this, this.logger, 'container/stop/hook:stopped', [ this ]);
    workflows.down = new Workflow(this, this.logger, 'container/stop/hook:down', [ this ]);
    workflows.unload = new Workflow(this, this.logger, 'container/stop/hook:unload', [ this ]);

    function applyWorkflowEvent(name, that) {
        workflows.load.pushStep(name, that.onContainerLoad.bind(that));
        workflows.up.pushStep(name, that.onContainerUp.bind(that));
        workflows.started.pushStep(name, that.onContainerStarted.bind(that));

        workflows.stopped.unshiftStep(name, that.onContainerStopped.bind(that));
        workflows.down.unshiftStep(name, that.onContainerDown.bind(that));
        workflows.unload.unshiftStep(name, that.onContainerUnload.bind(that));
    }

    applyWorkflowEvent('network', this.profile.getContainerNetwork());

    Object.keys(this.profile.compconf.get('imageconf.runtime.volume', {})).forEach(
        function (key) {
            applyWorkflowEvent('volume/' + key, that.profile.getContainerVolume(key));
        }
    );

    Object.keys(this.profile.compconf.get('imageconf.runtime.provide', {})).forEach(
        function (key) {
            applyWorkflowEvent('provision/' + key, that.profile.getContainerProvision(key));
        }
    );

    Object.keys(this.profile.compconf.get('imageconf.runtime.require', {})).forEach(
        function (key) {
            applyWorkflowEvent('requirement/' + key, that.profile.getContainerRequirement(key));
        }
    );

    return workflows;
}

function Container(profile, logger) {
    this.profile = profile;
    this.engine = profile.getImageEngine();
    this.logger = logger;

    this.id = null;
    this.env = {};
    this.volume = {};
    this.networkInterface = null;
    this.networkPrivateAddress = null;
    this.networkPublicAddress = null;
    this.provision = {};

    this.handle = null;
    this.stopping = false;

    this.storage = {};
    this.workflows = createWorkflows.call(this);
}

util.inherits(Container, events.EventEmitter);

Container.prototype.setId = function (id) {
    this.id = id;
}

Container.prototype.getId = function () {
    return this.id;
}

// --

Container.prototype.setEnv = function (key, value) {
    this.env[key] = value;
}

Container.prototype.getAllEnv = function () {
    return this.env;
}

// --

Container.prototype.setVolume = function (name, path) {
    this.volume[name] = path;
}

Container.prototype.getVolume = function () {
    return this.volume[name];
}

// --

Container.prototype.setNetworkInterface = function (networkInterface) {
    this.networkInterface = networkInterface;
}

Container.prototype.getNetworkInterface = function () {
    return this.networkInterface;
}

Container.prototype.setNetworkPrivateAddress = function (networkPrivateAddress) {
    this.networkPrivateAddress = networkPrivateAddress;
}

Container.prototype.getNetworkPrivateAddress = function () {
    return this.networkPrivateAddress;
}

Container.prototype.setNetworkPublicAddress = function (networkPublicAddress) {
    this.networkPublicAddress = networkPublicAddress;
}

Container.prototype.getNetworkPublicAddress = function () {
    return this.networkPublicAddress;
}

// --

Container.prototype.setProvision = function (name, protocol, port) {
    this.provision[name] = {
        protocol : protocol,
        port : port
    };
}

Container.prototype.getProvision = function () {
    return this.provision[name];
}

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

Container.prototype.start = function (callback) {
    var that = this;

    var command = new Workflow(this, this.logger, 'container/start');

    command.pushStep('id', function (workflow, callback1) {
        this.engine.generateId(
            function (error, result) {
                if (error) {
                    callback1(error);

                    return;
                }

                that.id = that.engine.getType() + '-' + result;

                callback1();
            }
        );
    });

    command.pushStep('hook:load', function (workflow, callback1) {
        this.workflows.load.run(callback1);
    });

    command.pushStep('engine:start', function (workflow, callback1) {
        this.engine.start(
            this,
            callback1
        );
    });

    command.pushStep('hook:up', function (workflow, callback1) {
        this.workflows.up.run(callback1);
    });

    command.pushStep('hook:started', function (workflow, callback1) {
        this.workflows.started.run(callback1);
    });

    command.run(
        function (error, result) {
            callback(error, result);
        }
    );
}

Container.prototype.stop = function (callback) {
    if (true === this.stopping) {
        this.logger.silly('container/stop', 'ignored secondary stop call');

        return;
    }

    this.stopping = true;

    var command = new Workflow(this, this.logger, 'container/stop');

    command.pushStep('hook:stopped', function (workflow, callback1) {
        this.workflows.stopped.run(callback1);
    });

    command.pushStep('engine:stop', function (workflow, callback1) {
        this.engine.stop(
            this,
            callback1
        );
    });

    command.pushStep('hook:down', function (workflow, callback1) {
        this.workflows.down.run(callback1);
    });

    command.pushStep('hook:unload', function (workflow, callback1) {
        this.workflows.unload.run(callback1);
    });

    command.run(
        function (error, result) {
            callback(error, result);
        }
    );
}

// --

module.exports = Container;
