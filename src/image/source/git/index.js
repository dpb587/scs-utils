var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var yaml = require('js-yaml');

var Workflow = require('../../../util/workflow');

// --

function Source(cimage, logger) {
    this.cimage = cimage;
    this.logger = logger;
}

Source.prototype.recompileCanonicalize = function (callback) {
    var uri = this.cimage.get('uri');

    if ('file://' == uri.substring(0, 7)) {
        uri = 'file://' + path.resolve(process.cwd(), uri.substring(7));
    }

    var that = this;
    var reference = this.cimage.get('reference');

    if (null === reference) {
        reference = 'master';
    }

    if (/^[a-f0-9]{40}$/.exec(reference)) {
        callback(null, { uri : uri, reference : reference });

        return;
    }

    var cmd = this.cimage.get('binary.git') + ' ls-remote "' + uri + '" | grep  -E \'refs/(heads|tags)/' + reference + '\' | awk \'{ print $1 }\'';

    this.logger.silly(
        'image/source/git/resolve-reference/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            that.logger.silly(
                'image/source/git/resolve-reference/stdout',
                stdout
            );

            if (error) {
                that.logger.verbose(
                    'image/source/git/resolve-reference/stderr',
                    stderr
                );

                callback(error);

                return;
            }

            callback(
                null,
                {
                    uri : uri,
                    reference : stdout.trim()
                }
            );
        }
    );
}

Source.prototype.reloadImageManifest = function (callback) {
    if ('file://' == this.cimage.get('uri').substring(0, 7)) {
        var cmd = this.cimage.get('binary.git') + ' show ' + this.cimage.get('reference') + ':scs/image.yaml';

        child_process.exec(
            cmd,
            {
                env : {
                    GIT_DIR : this.cimage.get('uri').substring(7) + '/.git'
                }
            },
            function (error, stdout, stderr) {
                if (error) {
                    callback(error);

                    return;
                }

                callback(null, yaml.safeLoad(stdout));
            }
        );
    } else {
        // long form
        callback(new Error('asdf'));
    }
}

Source.prototype.createWorkingDirectory = function (workdir, callback) {
    var workflow = new Workflow(this, this.logger, 'image/source/git/working-directory', [ workdir ]);
    workflow.pushStep(
        'fetch-or-clone',
        function (workflow, callback1, workdir) {
            if (fs.existsSync(workdir + '/.git')) {
                createWorkingDirectory_Fetch.call(this, workflow, callback1, workdir);
            } else {
                createWorkingDirectory_Clone.call(this, workflow, callback1, workdir);
            }
        }.bind(this)
    );
    workflow.pushStep('checkout', createWorkingDirectory_Checkout);
    workflow.run(callback);
}

function createWorkingDirectory_Checkout (workflow, callback, workdir) {
    var that = this;
    var cmd = this.cimage.get('binary.git') + ' checkout -q "' + this.cimage.get('reference') + '"';

    this.logger.silly(
        workflow.currStepTopic + '/exec',
        cmd
    );

    child_process.exec(
        cmd,
        {
            cwd : workdir
        },
        function (error, stdout, stderr) {
            that.logger.silly(
                workflow.currStepTopic + '/stdout',
                stdout
            );

            if (stderr) {
                that.logger.verbose(
                    workflow.currStepTopic + '/stderr',
                    stderr
                );
            }

            if (error) {
                callback(error);

                return;
            }

            callback(null, true);
        }
    );
}

function createWorkingDirectory_Clone (workflow, callback, workdir) {
    var that = this;
    var cmd = this.cimage.get('binary.git') + ' clone "' + this.cimage.get('uri') + '" "' + workdir + '"';

    this.logger.silly(
        workflow.currStepTopic + '/exec',
        cmd
    );

    child_process.exec(
        cmd,
        {
            cwd : workdir
        },
        function (error, stdout, stderr) {
            that.logger.silly(
                workflow.currStepTopic + '/stdout',
                stdout
            );

            if (stderr) {
                that.logger.verbose(
                    workflow.currStepTopic + '/stderr',
                    stderr
                );
            }

            if (error) {
                callback(error);

                return;
            }

            callback(null, true);
        }
    );
}

function createWorkingDirectory_Fetch (workflow, callback, workdir) {
    var that = this;
    var cmd = this.cimage.get('binary.git') + ' fetch';

    this.logger.silly(
        workflow.currStepTopic + '/exec',
        cmd
    );

    child_process.exec(
        cmd,
        {
            cwd : workdir
        },
        function (error, stdout, stderr) {
            that.logger.silly(
                workflow.currStepTopic + '/stdout',
                stdout
            );

            if (stderr) {
                that.logger.verbose(
                    workflow.currStepTopic + '/stderr',
                    stderr
                );
            }

            if (error) {
                callback(error);

                return;
            }

            callback(null, true);
        }
    );
}

// --

module.exports = Source;