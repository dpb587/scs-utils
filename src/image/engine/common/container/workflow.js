var Workflow = require('../../../../util/workflow');

// --

function ContainerWorkflow(container, logger) {
    this.container = container;
    this.logger = logger;
    this.workflows = createWorkflows.call(this);
}

// --

ContainerWorkflow.prototype.start = function (engineCommand, callback) {
    var command = new Workflow(this, this.logger, 'container/start');

    command.pushStep('hook:load', function (workflow, callback1) {
        this.workflows.load.run(callback1);
    });

    command.pushStep('engine:start', function (workflow, callback1) {
        engineCommand(callback1);
    });

    command.pushStep('hook:up', function (workflow, callback1) {
        this.workflows.up.run(callback1);
    });

    command.pushStep('hook:started', function (workflow, callback1) {
        this.workflows.started.run(callback1);
    });

    command.run(callback);
}

ContainerWorkflow.prototype.stop = function (engineCommand, callback) {
    var command = new Workflow(this, this.logger, 'container/stop');

    command.pushStep('hook:stopped', function (workflow, callback1) {
        this.workflows.stopped.run(callback1);
    });

    command.pushStep('engine:stop', function (workflow, callback1) {
        engineCommand(callback1);
    });

    command.pushStep('hook:down', function (workflow, callback1) {
        this.workflows.down.run(callback1);
    });

    command.pushStep('hook:unload', function (workflow, callback1) {
        this.workflows.unload.run(callback1);
    });

    command.run(callback);
}

// --

function createWorkflows () {
    var that = this;
    var workflows = {};

    workflows.load = new Workflow(null, this.logger, 'container/start/hook:load', [ this.container ]);
    workflows.up = new Workflow(null, this.logger, 'container/start/hook:up', [ this.container ]);
    workflows.started = new Workflow(null, this.logger, 'container/start/hook:started', [ this.container ]);

    workflows.stopped = new Workflow(null, this.logger, 'container/stop/hook:stopped', [ this.container ]);
    workflows.down = new Workflow(null, this.logger, 'container/stop/hook:down', [ this.container ]);
    workflows.unload = new Workflow(null, this.logger, 'container/stop/hook:unload', [ this.container ]);

    workflows.load.pushStep(
        'engine',
        function (workflow, callback, container) {
            container.onContainerLoad(workflow, callback);
        }
    );

    function applyWorkflowEvent(name, that) {
        workflows.load.pushStep(name, that.onContainerLoad.bind(that));
        workflows.up.pushStep(name, that.onContainerUp.bind(that));
        workflows.started.pushStep(name, that.onContainerStarted.bind(that));

        workflows.stopped.unshiftStep(name, that.onContainerStopped.bind(that));
        workflows.down.unshiftStep(name, that.onContainerDown.bind(that));
        workflows.unload.unshiftStep(name, that.onContainerUnload.bind(that));
    }

    applyWorkflowEvent('network', this.container.getRuntimeNetwork());

    var v = Object.keys(this.container.ccontainer.get('volume', {}));
    v.sort();

    v.forEach(
        function (key) {
            applyWorkflowEvent('volume/' + key, that.container.getRuntimeVolume(key));
        }
    );

    Object.keys(this.container.ccontainer.get('provide', {})).forEach(
        function (key) {
            applyWorkflowEvent('provision/' + key, that.container.getRuntimeProvide(key));
        }
    );

    Object.keys(this.container.ccontainer.get('require', {})).forEach(
        function (key) {
            applyWorkflowEvent('requirement/' + key, that.container.getRuntimeRequire(key));
        }
    );

    workflows.load.pushStep(
        'engine',
        function (workflow, callback, container) {
            container.onContainerUnload(workflow, callback);
        }
    );

    return workflows;
}

// --

module.exports = ContainerWorkflow;
