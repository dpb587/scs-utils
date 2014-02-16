var child_process = require('child_process');
var DiscoTcpClient = require('../../../../../../disco/service/tcp/client/service');

// --

function Provision(profile, id, config, logger) {
    this.profile = profile;
    this.id = id;
    this.config = config;
    this.logger = logger;

    this.discoId = null;

    this.config.set('name.environment', this.profile.runconf.get('name.environment'), false);
    this.config.set('name.service', this.profile.runconf.get('name.service'), false);
    this.config.set('name.role', this.profile.runconf.get('name.role'), false);
    this.config.set('name.endpoint', this.id, false);
    this.config.set('attributes', {}, false);

    this.config.log(this.logger, 'silly', 'container/provide/' + this.id + '/config');
}

Provision.prototype.getDiscoClient = function (container) {
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

Provision.prototype.onContainerLoad = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerStarted = function (steps, callback, container) {
    var that = this;
    var provide = this.profile.compconf.get('imageconf.runtime.provide.' + this.id);

    child_process.exec(
        'docker port ' + container.handleId + ' ' + provide.port + '/' + (('protocol' in provide) ? provide.protocol : 'tcp'),
        function (error, stdout, stderr) {
            if (error) {
                callback(error);

                return;
            }

            var split = stdout.trim().split(':');

            that.discoId = that.getDiscoClient(container).addProvision(
                that.id,
                {
                    address : ('0.0.0.0' == split[0]) ? container.getNetworkPublicAddress() : split[0],
                    port : split[1]
                },
                {
                    environment : that.config.get('name.environment'),
                    service : that.config.get('name.service'),
                    role : that.config.get('name.role'),
                    attributes : that.config.get('attributes')
                }
            );

            callback();
        }
    );
}

Provision.prototype.onContainerStopped = function (steps, callback, container) {
    this.getDiscoClient(container).dropProvision(
        this.discoId,
        5000,
        callback
    );
}

Provision.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Provision.prototype.onContainerUnload = function (steps, callback, container) {
    this.getDiscoClient(container).stop();

    callback();
};

// --

module.exports = Provision;
