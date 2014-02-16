var child_process = require('child_process');
var util = require('util');

var DiscoDependencyBase = require('../../../../../common/container/dependency/common/disco');

// --

function Requirement(id, cimage, ccontainer, logger) {
    this.id = id;
    this.cimage = cimage;
    this.ccontainer = ccontainer;
    this.logger = logger;

    this.discoState = null;

    DiscoDependencyBase.call(this);
}

util.inherits(Requirement, DiscoDependencyBase);

// --

Requirement.prototype.onContainerLoad = function (steps, callback, container) {
    var that = this;
    var disco = this.getDiscoClient(container);

    this.discoId = disco.addRequirement(
        this.id,
        {
            environment : this.ccontainer.get('name.environment'),
            service : this.ccontainer.get('name.service'),
            role : this.ccontainer.get('name.role'),
            attributes : this.ccontainer.get('attributes')
        },
        function (action, endpoints, callback1) {
            if ('initial' == action) {
                that.discoState = endpoints;

                container.env.setVariable('SCS_REQUIRE_' + that.id.toUpperCase(), simplifyEndpoints(that.discoState));

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

            if (true === that.cimage.get('liveupdate.enabled')) {
                var env = {};
                env['SCS_REQUIRE_' + that.id.toUpperCase()] = simplifyEndpoints(that.discoState);

                var cmd = that.cimage.get('liveupdate.command');

                that.logger.verbose(
                    'container/dependency/require/' + that.id + '/liveupdate',
                    'running...'
                );

                that.logger.silly(
                    'container/dependency/require/' + that.id + '/liveupdate/env',
                    JSON.stringify(env)
                );

                that.logger.silly(
                    'container/dependency/require/' + that.id + '/liveupdate/exec',
                    cmd
                );

                var liveupdate = child_process.spawn(
                    'lxc-attach',
                    [
                        '-n',
                        container.dockerContainerId,
                        '--keep-env',
                        cmd
                    ],
                    {
                        env : env,
                        timeout : that.cimage.get('liveupdate.timeout')
                    }
                );
                
                liveupdate.stdout.on(
                    'data',
                    function (data) {
                        that.logger.silly(
                            'container/dependency/require/' + that.id + '/liveupdate/stdout',
                            data.toString('utf8')
                        );
                    }
                );

                liveupdate.stderr.on(
                    'data',
                    function (data) {
                        that.logger.error(
                            'container/dependency/require/' + that.id + '/liveupdate/stderr',
                            data.toString('utf8')
                        );
                    }
                );

                liveupdate.on(
                    'close',
                    function (code) {
                        that.logger.silly(
                            'container/dependency/require/' + that.id + '/liveupdate/exit',
                            code
                        );

                        if (0 < code) {
                            that.logger.error(
                                'container/dependency/require/' + that.id + '/liveupdate',
                                'failed (exited ' + code + ')'
                            );

                            process.kill(process.pid, 'SIGTERM');

                            return;
                        }

                        that.logger.info(
                            'container/dependency/require/' + that.id + '/liveupdate',
                            'success'
                        );

                        callback1();
                    }
                );
            } else {
                callback1();

                that.logger.warn('container/dependency/require/' + that.id + '/liveupdate', 'unsupported');

                process.kill(process.pid, 'SIGTERM');
            }
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

function simplifyEndpoints (state) {
    var endpoints = [];

    state.forEach(function (endpoint) {
        endpoints.push(endpoint.address.address + ':' + endpoint.address.port);
    });

    return endpoints.join(';');
}

// --

module.exports = Requirement;
