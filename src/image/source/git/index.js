var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

// --

function Source(profile, config, logger) {
    this.profile = profile;
    this.config = config;
    this.logger = logger;

    this.config.log(this.logger, 'silly', 'image/source/git/config');
}

Source.prototype.getAbsoluteUri = function () {
    var uri = this.profile.runconf.get('source.uri');

    if ('file://' == uri.substring(0, 7)) {
        return 'file://' + path.resolve(process.cwd(), uri.substring(7));
    }

    return uri;
}

Source.prototype.resolveReference = function (callback) {
    var that = this;
    var reference = this.profile.runconf.get('source.reference');

    if (null === reference) {
        reference = 'master';
    }

    if (/^[a-f0-9]{40}$/.exec(reference)) {
        callback(null, reference);

        return;
    }

    var cmd = 'git ls-remote "' + this.getAbsoluteUri() + '" | grep  -E \'refs/(heads|tags)/' + reference + '\' | awk \'{ print $1 }\'';

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

            callback(null, stdout.trim());
        }
    );
}

function checkoutWorkingDirectoryStep (steps, callback) {
    var that = this;
    var cmd = 'git checkout -q "' + this.profile.compconf.get('source.reference_canonical') + '"';

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

function cloneWorkingDirectoryStep (steps, callback) {
    var that = this;
    var cmd = 'git clone "' + this.getAbsoluteUri() + '" "' + this.profile.compconf.get('ident.tmppath') + '"';

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

function fetchWorkingDirectoryStep (steps, callback) {
    var that = this;
    var cmd = 'git fetch';

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

Source.prototype.createWorkingDirectoryStep = function (steps, callback) {
    var that = this;

    steps.unshiftStep(
        'checking out reference',
        checkoutWorkingDirectoryStep.bind(this)
    );

    if (fs.existsSync(this.profile.compconf.get('ident.tmppath') + '/.git')) {
        steps.unshiftStep(
            'fetching upstream repository',
            fetchWorkingDirectoryStep.bind(this)
        );
    } else {
        steps.unshiftStep(
            'cloning upstream repository',
            cloneWorkingDirectoryStep.bind(this)
        );
    }

    callback(null, true);
}

// --

module.exports = Source;