var child_process = require('child_process');
var fs = require('fs');

// --

function Engine(profile, config, logger) {
    this.profile = profile;
    this.config = config;
    this.logger = logger;

    this.config.log(this.logger, 'silly', 'image/engine/docker/config');
}

Engine.prototype.getType = function () {
    return 'docker';
}

Engine.prototype.hasImage = function (callback) {
    var that = this;
    var cmd = 'docker inspect "' + this.profile.compconf.get('ident.image') + '"';

    this.logger.silly(
        'image/engine/docker/has-image/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            that.logger.silly(
                'image/engine/docker/has-image/stdout',
                stdout
            );

            if (stderr) {
                that.logger.verbose(
                    'image/engine/docker/has-image/stderr',
                    stderr
                );
            }

            if (error) {
                callback(null, false);

                return;
            }

            callback(null, true);
        }
    );
}

function writeDockerfileStep (workflow, callback) {
    dockerfile = []

    dockerfile.push('FROM ' + this.profile.compconf.get('imageconf.engine.docker.from'));

    dockerfile.push('ENV SCS_ENVIRONMENT ' + this.profile.runconf.get('name.environment'));
    dockerfile.push('ENV SCS_SERVICE ' + this.profile.runconf.get('name.service'));
    dockerfile.push('ENV SCS_ROLE ' + this.profile.runconf.get('name.role'));

    if (true === this.profile.runconf.get('name.dev', false)) {
        dockerfile.push('VOLUME /scs');
    } else {
        dockerfile.push('ADD . /scs');
    }

    var volumes = this.profile.compconf.get('imageconf.runtime.volume');

    Object.keys(volumes).forEach(
        function (name) {
            dockerfile.push('VOLUME /scs-mnt/' + name);
        }
    );

    var provide = this.profile.compconf.get('imageconf.runtime.provide');

    Object.keys(provide).forEach(
        function (name) {
            dockerfile.push('EXPOSE ' + provide[name].port + '/' + (('protocol' in provide[name]) ? provide[name].protocol : 'tcp'));
        }
    );

    dockerfile.push('EXPOSE 9001')

    var path = this.profile.compconf.get('ident.tmppath') + '/Dockerfile';

    fs.writeFileSync(path, dockerfile.join('\n'));
    fs.chmodSync(path, 0400);

    callback(null, true);
}

Engine.prototype.appendCompilationSteps = function (workflow) {
    workflow.pushStep(
        'writing Dockerfile',
        writeDockerfileStep.bind(this)
    );
}

Engine.prototype.runRequirementLiveupdate = function (command, requirement, config) {

}

// --

module.exports = Engine;
