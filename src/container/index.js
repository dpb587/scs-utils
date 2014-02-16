var events = require('events');
var util = require('util');

var Workflow = require('./workflow');
var Environment = require('./environment');

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

function Container(id, engine, image, runtime, logger) {
    this.id = id;
    this.engine = engine;
    this.image = image;
    this.runtime = runtime;
    this.logger = logger;

    this.env = new Environment();

    this.handle = null;
    this.stopping = false;

    this.storage = {};
    this.workflows = createWorkflows.call(this);
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
