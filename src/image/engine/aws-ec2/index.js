function Engine(options, logger) {
    this.options = options;
    this.logger = logger;
}

Engine.prototype.getType() {
    return 'aws-ec2';
}

Engine.prototype.hasImage = function (key, callback) {

}

Engine.prototype.runRequirementLiveupdate = function (command, requirement, options) {

}

// --

module.exports = Engine;
