var fs = require('fs');
var child_process = require('child_process');

var uuid = require('node-uuid');

// --

function Engine(idents, cimage, cruntime, logger) {
    this.idents = idents;
    this.cimage = cimage;
    this.cruntime = cruntime;
    this.logger = logger;
}

Engine.prototype.getType = function () {
    return 'docker';
}

Engine.prototype.hasImage = function (callback) {
    var that = this;
    var cmd = 'docker inspect "' + this.idents.get('global') + '"';

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

function writeDockerfileStep (workflow, callback, workdir) {
    dockerfile = []

    dockerfile.push('FROM ' + this.cimage.get('from'));
    dockerfile.push('ENV SCS_ENVIRONMENT ' + this.idents.get('environment'));
    dockerfile.push('ENV SCS_SERVICE ' + this.idents.get('service'));
    dockerfile.push('ENV SCS_ROLE ' + this.idents.get('role'));

    if (true === this.idents.get('dev', false)) {
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

    dockerfile.push('EXPOSE 9001/tcp');
    dockerfile.push('WORKDIR /scs');

    var patchpre = this.cruntime.get('build_patch.pre', {});

    Object.keys(patchpre).forEach(
        function (i) {
            dockerfile.push('RUN ' + patchpre[i]);
        }
    );

    dockerfile.push('RUN ./scs/compile');
    dockerfile.push('ENTRYPOINT [ "./scs/bin/run" ]');

    var patchpost = this.cruntime.get('build_patch.post', {});

    Object.keys(patchpost).forEach(
        function (i) {
            dockerfile.push('RUN ' + patchpost[i]);
        }
    );

    var path = this.profile.compconf.get('ident.tmppath') + '/Dockerfile';

    fs.writeFileSync(path, dockerfile.join('\n'));
    fs.chmodSync(path, 0600);

    callback(null, true);
}

Engine.prototype.appendCompilationSteps = function (workflow) {
    workflow.pushStep(
        'writing Dockerfile',
        writeDockerfileStep.bind(this)
    );
}

function buildBuildBase (workflow, callback) {
    var build = child_process.spawn(
        'docker',
        [ 'build', '-rm', '-t', this.profile.compconf.get('ident.image'), '.' ],
        {
            cwd : this.profile.compconf.get('ident.tmppath'),
            stdio : 'inherit'
        }
    );

    build.on('close', function (code) {
        if (0 < code) {
            throw new Error('docker build failed');

            return;
        }

        callback(null, true);
    })
}

function buildRemoveOldImages (workflow, callback) {
    var name = this.profile.compconf.get('ident.image');

    child_process.exec(
        'docker rmi ' + name + '-base ' + name,
        function (error, stdout, stderr) {
            child_process.exec(
                'docker rm ' + name + '-provisioned',
                function (error, stdout, stderr) {
                    callback(null, true);
                }
            );
        }
    );
}

Engine.prototype.build = function (workflow, callback) {
    workflow.pushStep(
        'removing old images',
        buildRemoveOldImages.bind(this)
    );

    workflow.pushStep(
        'build base image',
        buildBuildBase.bind(this)
    );

    callback(null, true);
}

Engine.prototype.stop = function (container, callback) {
    if (!container.handleActive) {
        // container probably died and we don't need to signal it
        callback();

        return;
    }

    container.handle.on(
        'exit',
        function () {
            callback();
        }
    );

    container.handle.kill('SIGTERM');
}

Engine.prototype.generateId = function (callback) {
    child_process.exec(
        'hostname -I | awk \'{ print $1 }\'',
        function (error, stdout, stderr) {
            if (error) {
                callback(error);

                return;
            }

            callback(null, stdout.trim() + '-' + uuid.v4().replace(/-/g, '').substring(0, 8));
        }
    );
}

Engine.prototype.start = function (container, callback) {
    var args = [];

    args.push('run');

    var provide = this.profile.compconf.get('imageconf.runtime.provide', {});

    Object.keys(provide).forEach(
        function (key) {
            args.push('-p', provide[key].port + '/' + (('protocol' in provide[key]) ? provide[key].protocol : 'tcp'));
        }
    );

    var volume = container.volume;

    Object.keys(volume).forEach(
        function (key) {
            args.push('-v', volume[key] + ':/scs-mnt/' + key);
        }
    );

    container.setEnv('SCS_RUN_ID', container.id);

    var env = process.env;
    var nenv = container.getAllEnv();

    Object.keys(nenv).forEach(
        function (key) {
            args.push('-e', key);
            env[key] = nenv[key];
        }
    );

    args.push('-cidfile', '/tmp/scs-' + container.id);
    args.push(this.profile.compconf.get('ident.image'));

    container.logger.verbose('container/run/env', JSON.stringify(env));
    container.logger.verbose('container/run/exec', 'docker ' + args.join(' '));

    var handle = child_process.spawn(
        'docker',
        args,
        {
            env : env,
            detached : true
        }
    );

    handle.stdout.on('data', function (data) {
        container.logger.verbose('container/run/stdout', data.toString('utf8'));
    });

    handle.stderr.on('data', function (data) {
        container.logger.verbose('container/run/stderr', data.toString('utf8'));
    });

    handle.on('exit', function (code) {
        container.handleActive = false;

        container.logger.verbose('container/run/exit', code);

        if (!container.stopping) {
            container.stop(function () {console.log('died'); });
        }
    });

    container.handle = handle;
    container.handleActive = true;

    setTimeout(
        function () {
            container.handleId = fs.readFileSync('/tmp/scs-' + container.id);

            callback();
        },
        5000
    );
}

Engine.prototype.runRequirementLiveupdate = function (command, requirement, config) {

}

// --

module.exports = Engine;
