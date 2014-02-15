var child_process = require('child_process');
var DiscoTcpClient = require('../../../../../../disco/service/tcp/client/service');

// --

function Provision(profile, id, config, logger) {
    this.profile = profile;
    this.id = id;
    this.config = config;
    this.logger = logger;

    this.config.set('environment', this.profile.runconf.get('name.environment'), false);
    this.config.set('service', this.profile.runconf.get('name.service'), false);
    this.config.set('role', this.profile.runconf.get('name.role'), false);
    this.config.set('endpoint', this.id, false);
    this.config.set('attributes', {}, false);

    this.config.log(this.logger, 'silly', 'container/provide/' + this.id + '/config');
}

Provision.prototype.getDiscoClient = function (container) {
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

Provision.prototype.onContainerLoad = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerStarted = function (steps, callback, container) {
    // @todo register
    var disco = this.getDiscoClient(container);

    disco.addProvision(
        this.id,
        {
            address : container.getNetworkPublicAddress(),
            port : 1234
        },
        {
            environment : this.config.get('environment'),
            service : this.config.get('service'),
            role : this.config.get('role'),
            attributes : this.config.get('attributes')
        }
    );

    callback();
}

Provision.prototype.onContainerStopped = function (steps, callback, container) {
    // @todo unregister
    callback();
}

Provision.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerUnload = function (steps, callback, container) {
    callback();
};

// --

module.exports = Provision;
