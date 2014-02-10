var fs = require('fs');
var yaml = require('js-yaml');

function Configurator(profile, config, logger) {
    this.profile = profile;
    this.config = config;
    this.logger = logger;

    this.config.log(this.logger, 'silly', 'image/configurator/puppet/config');
}

function writePuppetConfigurationStep (workflow, callback) {
    puppetfile = [
        '$SCS_ENVIRONMENT = "' + this.profile.runconf.get('name.environment') + '"',
        '$SCS_SERVICE = "' + this.profile.runconf.get('name.service') + '"',
        '$SCS_ROLE = "' + this.profile.runconf.get('name.role') + '"'
    ]

    var config = this.config.config;

    if (!('main' in config)) {
        puppetfile.push('include scs');
    }

    Object.keys(config).forEach(
        function (part) {
            if ('main' == part) {
                puppetfile.push('ensure_resource("class", "scs", parseyaml("' + yaml.safeDump(config[part]) + '"))');
            } else if ('puppet' == part) {
                Object.keys(config[part]).forEach(
                    function (ptype) {
                        Object.keys(config[part][ptype]).forEach(
                            function (pname) {
                                puppetfile.push('ensure_resource("' + ptype + '", "' + pname + '", parseyaml("' + yaml.safeDump(config[part][ptype][pname]) + '"))');
                            }
                        );
                    }
                );
            } else {
                Object.keys(config[part]).forEach(
                    function (name) {
                        puppetfile.push('ensure_resource("scs::' + name + '", "' + name + '", parseyaml("' + yaml.safeDump(config[part][name]) + '"))');
                    }
                );
            }
        }
    );

    var path = this.profile.compconf.get('ident.tmppath') + '/scs/image.pp';

    fs.writeFileSync(path, puppetfile.join('\n'));
    fs.chmodSync(path, 0400);

    callback(null, true);
}

function writeCompilationScriptStep (workflow, callback) {
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

    buildfile.push('/usr/bin/puppet apply --modulepath=/scs/scs/puppet:/etc/puppet/modules:/usr/share/puppet/modules /scs/scs/image.pp')

    buildfile.push('/usr/bin/apt-get -y remove --purge puppet')
    buildfile.push('/usr/bin/apt-get -y autoremove --purge')
    buildfile.push('/usr/bin/apt-get clean && /bin/rm -rf /var/cache/apt/archives/* /var/lib/apt/lists/*')

    var path = this.profile.compconf.get('ident.tmppath') + '/scs/compile';

    fs.writeFileSync(path, buildfile.join('\n'));
    fs.chmodSync(path, 0500);

    callback(null, true);
}

Configurator.prototype.appendCompilationSteps = function (workflow) {
    workflow.pushStep(
        'writing puppet configuration',
        writePuppetConfigurationStep.bind(this)
    );

    workflow.pushStep(
        'writing compilation script',
        writeCompilationScriptStep.bind(this)
    );
}

module.exports = Configurator;
