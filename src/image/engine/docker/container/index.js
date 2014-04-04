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

Container.prototype.onContainerLoad = function (workflow, callback) {
    var that = this;

    if (!fs.existsSync(this.ccontainer.get('engine.cidfile'))) {
        callback();

        return;
    }

    child_process.exec(
        'docker inspect -format "{{.State.Running}}" ' + fs.readFileSync(that.ccontainer.get('engine.cidfile'), { encoding : 'utf8' }),
        function (error, stdout, stderr) {
            if ('true' == stdout) {
                callback(new Error('According to cidfile, a docker container already seems to be running.'));

                return;
            }

            that.logger.info(
                'container/cidfile',
                'already exists, but seems to be stale'
            );

            fs.unlinkSync(that.ccontainer.get('engine.cidfile'));

            callback();
        }
    );
}

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

    if ('default' == this.env.getNetworkMode()) {
        // assume typical routing
        var exposedPortMap = this.env.getAllExposedPorts();

        Object.keys(exposedPortMap).forEach(
            function (key) {
                args.push('-p', (exposedPortMap[key].publishAddress ? exposedPortMap[key].publishAddress : '') + ':' + (exposedPortMap[key].publishPort ? exposedPortMap[key].publishPort : '') + ':' + exposedPortMap[key].port + '/' + exposedPortMap[key].protocol);
            }
        );
    }

    var volumeMap = this.env.getAllVolumes();

    Object.keys(volumeMap).forEach(
        function (key) {
            if ('_' == key[0]) {
                return;
            }

            args.push('-v', volumeMap[key] + ':/mnt/' + key);
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

    var rinterface;

    if ('physical' == this.env.getNetworkMode()) {
        if ('eth0' == this.env.getNetworkExternal().name) {
            throw new Error('sanity check: would detach eth0');
        }

        args.push('--lxc-conf=lxc.network.type=phys');
        args.push('--lxc-conf=lxc.network.link=' + this.env.getNetworkExternal().name);
        args.push('--lxc-conf=lxc.network.name=' + this.env.getNetworkExternal().name);
        args.push('--lxc-conf=lxc.network.hwaddr=' + this.env.getNetworkExternal().hwaddr);
        args.push('--lxc-conf=lxc.network.flags=up');
        args.push('--lxc-conf=lxc.network.ipv4=' + this.env.getNetworkExternal().address + '/' + this.env.getNetworkExternal().bitmask);
        args.push('--lxc-conf=lxc.network.ipv4.gateway=' + this.env.getNetworkExternal().gateway);
        args.push('--networking=false');

        rinterface = this.env.getNetworkExternal().name;
    } else {
        rinterface = this.env.getNetworkInternal().name;
    }

    args.push('--name', 'scs-' + this.ccontainer.get('name.local') + '--' + this.id);
    args.push('-cidfile', this.ccontainer.get('engine.cidfile'));
    args.push('scs-' + this.cimage.get('id.uid'));
    args.push(this.env.getNetworkExternal().name);

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
            that.logger.verbose(
                'container/run/exit',
                code
            );

            var ciddata = fs.readFileSync(that.ccontainer.get('engine.cidfile'), { encoding : 'utf8' });

            if (that.dockerContainerId == ciddata) {
                // it would be very odd if they did not match
                that.logger.silly(
                    'container/cidfile',
                    'removing'
                );

                fs.unlinkSync(that.ccontainer.get('engine.cidfile'));
            } else {
                that.logger.info(
                    'container/cidfile',
                    'not removing (cidfile says "' + ciddata + '" but runtime says "' + that.dockerContainerId + '")'
                );
            }

            if (this.dockerProcessActive) {
                that.dockerProcessActive = false;

                this.dockerProcess.kill('SIGTERM');
            }
        }
    );

    this.dockerProcess = dockerProcess;
    this.dockerProcessActive = true;

    setTimeout(
        function () {
            that.dockerContainerId = fs.readFileSync(that.ccontainer.get('engine.cidfile'), { encoding : 'utf8' });

            callback();
        },
        5000
    );
}

Container.prototype.runRequirementLiveupdate = function (command, requirement, config) {

}

// --

module.exports = Container;
