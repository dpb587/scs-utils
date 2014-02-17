var child_process = require('child_process');
var fs = require('fs');
var util = require('util');

var ContainerBase = require('../../common/container');

// --

function Container() {
    ContainerBase.apply(this, arguments);

    this.dockerProcess = null;
    this.dockerProcessActive = false;
    this.dockerContainerId = null;
}

util.inherits(Container, ContainerBase);

// --

Container.prototype.engineStop = function (callback) {
    if (!this.dockerProcessActive) {
        // this probably died and we don't need to signal it
        callback();

        return;
    }

    this.dockerProcess.on(
        'exit',
        function () {
            callback();
        }
    );

    this.dockerProcess.kill('SIGTERM');
}

Container.prototype.engineStart = function (callback) {
    var that = this;
    var args = [];

    args.push('run');

    var exposedPortMap = this.env.getAllExposedPorts();

    Object.keys(exposedPortMap).forEach(
        function (key) {
            args.push('-p', (exposedPortMap[key].publishAddress ? exposedPortMap[key].publishAddress : '') + ':' + (exposedPortMap[key].publishPort ? exposedPortMap[key].publishPort : '') + ':' + exposedPortMap[key].port + '/' + exposedPortMap[key].protocol);
        }
    );

    var volumeMap = this.env.getAllVolumes();

    Object.keys(volumeMap).forEach(
        function (key) {
            args.push('-v', volumeMap[key] + ':/scs-mnt/' + key);
        }
    );

    this.env.setVariable('SCS_RUN_ID', this.id);

    var env = process.env;
    var nenv = this.env.getAllVariables();

    Object.keys(nenv).forEach(
        function (key) {
            args.push('-e', key);
            env[key] = nenv[key];
        }
    );

    args.push('--name', 'scs-' + this.ccontainer.get('name.local') + '--' + this.id);
    args.push('-cidfile', '/tmp/scs-' + this.id + '.cid');
    args.push('scs-' + this.cimage.get('id.uid'));

    this.logger.verbose(
        'container/run/env',
        JSON.stringify(env)
    );

    this.logger.verbose(
        'container/run/exec',
        'docker ' + args.join(' ')
    );

    var dockerProcess = child_process.spawn(
        'docker',
        args,
        {
            env : env,
            detached : true
        }
    );

    dockerProcess.stdout.on(
        'data',
        function (data) {
            that.logger.verbose(
                'container/run/stdout',
                data.toString('utf8')
            );
        }
    );

    dockerProcess.stderr.on(
        'data',
        function (data) {
            that.logger.error(
                'container/run/stderr',
                data.toString('utf8')
            );
        }
    );

    dockerProcess.on(
        'exit',
        function (code) {
            that.dockerProcessActive = false;

            that.logger.verbose(
                'container/run/exit',
                code
            );
        }
    );

    this.dockerProcess = dockerProcess;
    this.dockerProcessActive = true;

    setTimeout(
        function () {
            that.dockerContainerId = fs.readFileSync('/tmp/scs-' + that.id + '.cid', { encoding : 'utf8' });

            callback();
        },
        5000
    );
}

Container.prototype.runRequirementLiveupdate = function (command, requirement, config) {

}

// --

module.exports = Container;
