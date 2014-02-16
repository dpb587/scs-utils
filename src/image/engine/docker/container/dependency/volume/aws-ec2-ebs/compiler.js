var Config = require('../../../../../../../util/config');

// --

module.exports = {};

module.exports.compileContainerConfig = function (names, id, configs) {
    var ccontainer = new Config();

    ccontainer.set('name.environment', names.get('environment'));
    ccontainer.set('name.service', names.get('service'));
    ccontainer.set('name.role', names.get('role') + '/' + id);

    ccontainer.set('mount.device', null);
    ccontainer.set('mount.path', '/var/lib/scs-utils/volume--aws-ec2-ebs--' + names.get('local'));
    ccontainer.set('mount.fstab', true);

    ccontainer.set('mkfs.type', 'ext4');
    ccontainer.set('mkfs.args', []);

    ccontainer.set('volume.size', null);
    ccontainer.set('volume.type', 'standard');
    ccontainer.set('volume.iops', null);
    ccontainer.set('volume.snapshot_id', null);

    configs.forEach(function (config) {
        ccontainer.importObject(config);
    });

    if (null == ccontainer.get('mount.device')) {
        throw new Error('You must specify mount.device for volume ' + id + '.');
    }

    return ccontainer.config;
}
