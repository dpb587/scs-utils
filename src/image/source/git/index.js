var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

// --

function Source(cruntime, logger) {
    this.cruntime = cruntime;
    this.logger = logger;
}

Source.prototype.recompileCanonicalize = function (callback) {
    var uri = this.cruntime.get('uri');

    if ('file://' == uri.substring(0, 7)) {
        uri = 'file://' + path.resolve(process.cwd(), uri.substring(7));
    }

    var that = this;
    var reference = this.cruntime.get('reference');

    if (null === reference) {
        reference = 'master';
    }

    if (/^[a-f0-9]{40}$/.exec(reference)) {
        callback(null, { uri : uri, reference : reference });

        return;
    }

    var cmd = this.cruntime.get('binary.git') + ' ls-remote "' + uri + '" | grep  -E \'refs/(heads|tags)/' + reference + '\' | awk \'{ print $1 }\'';

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
    if ('file://' == this.cruntime.get('uri').substring(0, 7)) {
        var cmd = this.cruntime.get('binary.git') + ' show ' + this.cruntime.get('reference') + ':scs/image.yaml';

        child_process.exec(
            cmd,
            {
                env : {
                    GIT_DIR : this.cruntime.get('uri').substring(7) + '/.git'
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

function checkoutWorkingDirectoryStep (workflow, callback) {
    var that = this;
    var cmd = this.cruntime.get('binary.git') + ' checkout -q "' + this.profile.compconf.get('reference') + '"';

    this.logger.silly(
        'image/source/git/checkout/exec',
        cmd
    );

    child_process.exec(
        cmd,
        {
            cwd : this.profile.compconf.get('ident.tmppath')
        },
        function (error, stdout, stderr) {
            that.logger.silly(
                'image/source/git/checkout/stdout',
                stdout
            );

            if (stderr) {
                that.logger.verbose(
                    'image/source/git/checkout/stderr',
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

function cloneWorkingDirectoryStep (workflow, callback) {
    var that = this;
    var cmd = this.cruntime.get('binary.git') + ' clone "' + this.getAbsoluteUri() + '" "' + this.profile.compconf.get('ident.tmppath') + '"';

    this.logger.silly(
        'image/source/git/clone/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            that.logger.silly(
                'image/source/git/clone/stdout',
                stdout
            );

            if (stderr) {
                that.logger.verbose(
                    'image/source/git/clone/stderr',
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

function fetchWorkingDirectoryStep (workflow, callback) {
    var that = this;
    var cmd = this.cruntime.get('binary.git') + ' fetch';

    this.logger.silly(
        'image/source/git/fetch/exec',
        cmd
    );

    child_process.exec(
        cmd,
        {
            cwd : this.profile.compconf.get('ident.tmppath')
        },
        function (error, stdout, stderr) {
            that.logger.silly(
                'image/source/git/fetch/stdout',
                stdout
            );

            if (stderr) {
                that.logger.verbose(
                    'image/source/git/fetch/stderr',
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

Source.prototype.createWorkingDirectoryStep = function (workflow, callback) {
    var that = this;

    workflow.unshiftStep(
        'checking out reference',
        checkoutWorkingDirectoryStep.bind(this)
    );

    if (fs.existsSync(this.profile.compconf.get('ident.tmppath') + '/.git')) {
        workflow.unshiftStep(
            'fetching upstream repository',
            fetchWorkingDirectoryStep.bind(this)
        );
    } else {
        workflow.unshiftStep(
            'cloning upstream repository',
            cloneWorkingDirectoryStep.bind(this)
        );
    }

    callback(null, true);
}

// --

module.exports = Source;