var child_process = require('child_process');
var DiscoTcpClient = require('../../../../../../disco/service/tcp/client/service');

// --

function Requirement(profile, id, config, logger) {
    this.profile = profile;
    this.id = id;
    this.config = config;
    this.logger = logger;

    this.discoId = null;
    this.discoState = null;

    this.config.set('name.environment', this.profile.runconf.get('name.environment'), false);
    this.config.set('name.service', this.profile.runconf.get('name.service'), false);
    this.config.set('name.role', this.profile.runconf.get('name.role'), false);
    this.config.set('name.endpoint', this.id, false);
    this.config.set('attributes', {}, false);

    this.config.log(this.logger, 'silly', 'container/require/' + this.id + '/config');
}

Requirement.prototype.getDiscoClient = function (container) {
    var that = this;

    return container.retrieve(
        'disco_' + this.config.get('server.address') + '_' + this.config.get('server.port'),
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

function simplifyEndpoints (state) {
    var endpoints = [];

    state.forEach(function (endpoint) {
        endpoints.push(endpoint.address.address + ':' + endpoint.address.port);
    });

    return endpoints.join(';');
}

Requirement.prototype.onContainerLoad = function (steps, callback, container) {
    var that = this;
    var disco = this.getDiscoClient(container);

    this.discoId = disco.addRequirement(
        this.id,
        {
            environment : this.config.get('name.environment'),
            service : this.config.get('name.service'),
            role : this.config.get('name.role'),
            attributes : this.config.get('attributes')
        },
        function (action, endpoints, callback1) {
            if ('initial' == action) {
                console.log(endpoints);

                that.discoState = endpoints;

                container.setEnv('SCS_REQUIRE_' + that.id.toUpperCase(), simplifyEndpoints(that.discoState));

                callback();

                return;
            }

            if ('add' == action) {
                that.discoState.push.apply(that.discoState, endpoints);
            } else if ('drop' == action) {
                var dropids = endpoints.map(
                    function (r) {
                        return r.id;
                    }
                );

                that.discoState = that.discoState.filter(
                    function (r) {
                        return -1 < dropids.indexOf(r);
                    }
                );
            }

            console.log('live update');
            console.log(simplifyEndpoints(that.discoState));
        }
    );
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
