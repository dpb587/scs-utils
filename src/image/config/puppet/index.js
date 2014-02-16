var fs = require('fs');

var yaml = require('js-yaml');

var Workflow = require('../../../util/workflow');

// --

function Configurator(cimage, logger) {
    this.cimage = cimage;
    this.logger = logger;
}

// --

function writePuppetConfigurationStep (workflow, callback, workdir) {
    puppetfile = [];

    var config = this.cimage.get('config', {});

    if (!('main' in config)) {
        puppetfile.push('include scs');
    }

    Object.keys(config).forEach(
        function (part) {
            if ('main' == part) {
                puppetfile.push('ensure_resource("class", "scs", parseyaml("' + yaml.safeDump(config[part]).replace(/"/g, '\\"') + '"))');
            } else if ('puppet' == part) {
                Object.keys(config[part]).forEach(
                    function (ptype) {
                        Object.keys(config[part][ptype]).forEach(
                            function (pname) {
                                puppetfile.push('ensure_resource("' + ptype + '", "' + pname + '", parseyaml("' + yaml.safeDump(config[part][ptype][pname]).replace(/"/g, '\\"') + '"))');
                            }
                        );
                    }
                );
            } else if ('_method' == part) {
                // internal config laziness
            } else {
                Object.keys(config[part]).forEach(
                    function (name) {
                        puppetfile.push('ensure_resource("scs::' + name + '", "' + name + '", parseyaml("' + yaml.safeDump(config[part][name]).replace(/"/g, '\\"') + '"))');
                    }
                );
            }
        }
    );

    var p = workdir + '/scs/image.pp';

    fs.writeFileSync(p, puppetfile.join('\n'));
    fs.chmodSync(p, 0600);

    callback(null, true);
}

function writeCompilationScriptStep (workflow, callback, workdir) {
    buildfile = []

    buildfile.push('#!/bin/bash')
    buildfile.push('set -e')

    buildfile.push('/bin/echo "deb http://archive.ubuntu.com/ubuntu/ precise universe" >> /etc/apt/sources.list')
    buildfile.push('/usr/bin/apt-get update')
    buildfile.push('/usr/bin/apt-get -y install wget ca-certificates')
    buildfile.push('/usr/bin/wget https://apt.puppetlabs.com/puppetlabs-release-precise.deb')
    buildfile.push('/usr/bin/dpkg -i puppetlabs-release-precise.deb')
    buildfile.push('/bin/rm puppetlabs-release-precise.deb')
    buildfile.push('/usr/bin/apt-get update')
    buildfile.push('/usr/bin/apt-get -y install puppet')
    buildfile.push('/usr/bin/puppet module install puppetlabs/stdlib')
    buildfile.push('/usr/bin/puppet apply --debug --modulepath=/scs/scs/puppet:/etc/puppet/modules:/usr/share/puppet/modules /scs/scs/image.pp')
    buildfile.push('/usr/bin/apt-get -y remove --purge puppet')
    buildfile.push('/usr/bin/apt-get -y autoremove --purge')
    buildfile.push('/usr/bin/apt-get clean && /bin/rm -rf /var/cache/apt/archives/* /var/lib/apt/lists/*')

    var p = workdir + '/scs/compile';

    fs.writeFileSync(p, buildfile.join('\n'));
    fs.chmodSync(p, 0700);

    callback(null, true);
}

Configurator.prototype.build = function (workdir, callback) {
    var workflow = new Workflow(this, this.logger, 'image/config/puppet/build', [ workdir ]);

    workflow.pushStep(
        'write-puppet-config',
        writePuppetConfigurationStep
    );

    workflow.pushStep(
        'write-compile-script',
        writeCompilationScriptStep
    );

    workflow.run(callback);
}

// --

module.exports = Configurator;
