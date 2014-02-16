var child_process = require('child_process');
var DiscoTcpClient = require('../../../../../../disco/service/tcp/client/service');

// --

function Requirement(id, cimage, cruntime, logger) {
    this.id = id;
    this.cimage = cimage;
    this.cruntime = cruntime;
    this.logger = logger;

    this.discoId = null;
    this.discoState = null;
}

Requirement.prototype.getDiscoClient = function (container) {
    var that = this;

    return container.retrieve(
        'disco_' + this.cruntime.get('server.address') + '_' + this.cruntime.get('server.port'),
        function () {
            var disco = new DiscoTcpClient(
                {
                    server : that.cruntime.get('server')
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
            environment : this.cruntime.get('name.environment'),
            service : this.cruntime.get('name.service'),
            role : this.cruntime.get('name.role'),
            attributes : this.cruntime.get('attributes')
        },
        function (action, endpoints, callback1) {
            if ('initial' == action) {
                console.log(endpoints);

                that.discoState = endpoints;

                container.setEnv('SCS_REQUIRE_' + that.id.toUpperCase(), simplifyEndpoints(that.discoState));

                callback1();
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
                        return -1 < dropids.indexOf(r.id);
                    }
                );
            }

            console.log('live update');
            console.log(simplifyEndpoints(that.discoState));

            callback1();
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
    this.getDiscoClient(container).dropRequirement(
        this.discoId,
        callback
    );
}

Requirement.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Requirement.prototype.onContainerUnload = function (steps, callback, container) {
    this.getDiscoClient(container).stop();

    callback();
};

// --

module.exports = Requirement;
