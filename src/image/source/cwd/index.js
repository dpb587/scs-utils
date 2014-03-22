var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var yaml = require('js-yaml');

// --

function Source(cimage, logger) {
    this.cimage = cimage;
    this.logger = logger;
}

Source.prototype.recompileCanonicalize = function (callback) {
    callback(
        null,
        {
            uri : this.cimage.get('path'),
            reference : 'missing'
        }
    );
}

Source.prototype.getCacheDirectory = function () {
    return this.cimage.get('path');
}

Source.prototype.reloadImageManifest = function (callback) {
    callback(
        null,
        yaml.safeLoad(fs.readFileSync(this.cimage.get('path') + '/scs.yaml', { encoding : 'utf8' }))
    );
}

Source.prototype.createWorkingDirectory = function (workdir, callback) {
    var that = this;
    var cmd = '/bin/bash -c \'[[ -d "' + workdir + '" ]] && rm -fr "' + workdir + '" ; cp -r "' + this.cimage.get('path') + '" "' + workdir + '"\'';

    this.logger.verbose(
        'source/cwd/exec',
        cmd
    );
    
    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (stdout) {
                that.logger.silly(
                    'source/cwd/stdout',
                    stdout
                );
            }

            if (stderr) {
                that.logger.silly(
                    'source/cwd/stderr',
                    stderr
                );
            }

            if (error) {
                return;
            }

            if (!fs.existsSync(workdir + '/.build')) {
                fs.mkdirSync(workdir + '/.build');
            }

            callback();
        }
    );
}

// --

module.exports = Source;
