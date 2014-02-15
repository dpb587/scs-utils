var child_process = require('child_process');

// --

function Requirement(profile, id, config, logger) {
    this.profile = profile;
    this.id = id;
    this.config = config;
    this.logger = logger;

    this.config.set('environment', this.profile.runconf.get('name.environment'), false);
    this.config.set('service', this.profile.runconf.get('name.service'), false);
    this.config.set('role', this.profile.runconf.get('name.role'), false);
    this.config.set('endpoint', this.id, false);
    this.config.set('attributes', {}, false);

    this.config.log(this.logger, 'silly', 'container/require/' + this.id + '/config');
}

Requirement.prototype.getDiscoClient = function (container) {
    var that = this;

    return container.retrieve(
        'disco_' + this.config.get('server.host') + '_' + this.config.get('server.port'),
        function () {
            var disco = new DiscoTcpClient(
                {
                    server : that.config.get('server')
                },
                that.logger
            );

            disco.start();

            return disco;
        }
    );
}

Requirement.prototype.onContainerLoad = function (steps, callback, container) {
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
