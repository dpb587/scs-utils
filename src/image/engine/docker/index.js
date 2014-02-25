var fs = require('fs');
var child_process = require('child_process');

var uuid = require('node-uuid');

var Workflow = require('../../../util/workflow');

// --

function Engine(cimage, logger) {
    this.cimage = cimage;
    this.logger = logger;
}

// --

Engine.prototype.hasImage = function (callback) {
    var that = this;
    var cmd = 'docker inspect "scs-' + this.cimage.get('id.uid') + '"';

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

function build_WriteDockerfile (workflow, callback, workdir) {
    dockerfile = []

    dockerfile.push('FROM ' + this.cimage.get('engine.from'));
    dockerfile.push('ADD . /scs');

    var volumeMap = this.cimage.get('dependency.volume', {});

    Object.keys(volumeMap).forEach(
        function (name) {
            dockerfile.push('VOLUME /scs-mnt/' + name);
        }
    );

    var provideMap = this.cimage.get('dependency.provide');

    Object.keys(provideMap).forEach(
        function (name) {
            dockerfile.push('EXPOSE ' + provideMap[name].port + '/' + provideMap[name].protocol);
        }
    );

    dockerfile.push('WORKDIR /scs');

    var patchpre = this.cimage.get('engine.build_patch.pre', {});

    Object.keys(patchpre).forEach(
        function (i) {
            dockerfile.push('RUN ' + patchpre[i]);
        }
    );

    dockerfile.push('RUN ./scs/compile');
    dockerfile.push('ENTRYPOINT [ "./scs/bin/run" ]');

    var patchpost = this.cimage.get('engine.build_patch.post', {});

    Object.keys(patchpost).forEach(
        function (i) {
            dockerfile.push('RUN ' + patchpost[i]);
        }
    );

    var p = workdir + '/Dockerfile';

    fs.writeFileSync(p, dockerfile.join('\n'));
    fs.chmodSync(p, 0600);

    callback(null, true);
}

function build_BuildBase (workflow, callback, workdir) {
    var build = child_process.spawn(
        'docker',
        [ 'build', '-rm', '-t', 'scs-' + this.cimage.get('id.uid'), '.' ],
        {
            cwd : workdir,
            stdio : 'inherit'
        }
    );

    build.on('close', function (code) {
        if (0 < code) {
            callback(new Error('docker build failed'));

            return;
        }

        callback(null, true);
    })
}

function build_PurgeOld (workflow, callback, workdir) {
    var name = 'scs-' + this.cimage.get('id.uid');

    child_process.exec(
        'docker rmi ' + name,
        function (error, stdout, stderr) {
            callback(null, true);
        }
    );
}

Engine.prototype.build = function (workdir, callback) {
    var workflow = new Workflow(this, this.logger, 'image/engine/docker/build', [ workdir ]);

    workflow.pushStep(
        'write-dockerfile',
        build_WriteDockerfile
    );

    workflow.pushStep(
        'purge-old',
        build_PurgeOld
    );

    workflow.pushStep(
        'build-base',
        build_BuildBase
    );

    workflow.run(callback);
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

// --

module.exports = Engine;
