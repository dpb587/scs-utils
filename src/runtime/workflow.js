

// --

function Workflow(profile, topic) {
    this.profile = profile;
    this.topic = topic;
    this.steps = [];

    this.callback = null;
    this.currStep = null;

    this.nextStep = this.nextStep.bind(this);
}

Workflow.prototype.pushStep = function (topic, callback) {
    this.steps.push([ topic, callback ]);
}

Workflow.prototype.unshiftStep = function (topic, callback) {
    this.steps.unshift([ topic, callback ]);
}

Workflow.prototype.nextStep = function (error, result) {
    if (this.currStep) {
        this.profile.logger.verbose(
            this.topic + '/step/finish',
            this.currStep[0]
        );

        if (error) {
            this.callback(error);

            return;
        }
    }

    this.currStep = this.steps.shift();

    if (!this.currStep) {
        this.callback(null, true);

        return;
    }

    this.profile.logger.verbose(
        this.topic + '/step/start',
        this.currStep[0]
    );

    this.currStep[1](
        this,
        this.nextStep
    );
}

Workflow.prototype.run = function (callback) {
    this.callback = callback;

    this.nextStep();
}

// --

module.exports = Workflow;
