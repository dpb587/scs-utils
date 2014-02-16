var child_process = require('child_process');
var fs = require('fs');
var http = require('http');
var path = require('path');

var AWS = require('aws-sdk');

// --

var devicemap = {
    ubuntu : {
        '/dev/xvdf' : '/dev/sdf',
        '/dev/xvdg' : '/dev/sdg',
        '/dev/xvdh' : '/dev/sdh',
        '/dev/xvdi' : '/dev/sdi',
        '/dev/xvdj' : '/dev/sdj',
        '/dev/xvdk' : '/dev/sdk',
        '/dev/xvdl' : '/dev/sdl',
        '/dev/xvdm' : '/dev/sdm',
        '/dev/xvdn' : '/dev/sdn',
        '/dev/xvdo' : '/dev/sdo',
        '/dev/xvdp' : '/dev/sdp'
    }
}

// --

var workflow_load = {};

workflow_load.mount_fstab = function (workflow, callback) {
    var that = this;

    var cmd = 'grep "' + this.ccontainer.get('mount.device') + '" /etc/fstab';

    this.logger.silly(
        'volume/aws-ec2-ebs/fstab/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (!error) {
                callback();

                return;
            }

            var cmd = 'echo "' + that.ccontainer.get('mount.device') + '    ' + that.ccontainer.get('mount.path') + '    ' + that.ccontainer.get('mkfs.type') + '    defaults    0    2" >> /etc/fstab';

            that.logger.silly(
                'volume/aws-ec2-ebs/fstab/exec',
                cmd
            );

            child_process.exec(
                cmd,
                function (error, stdout, stderr) {
                    if (error) {
                        callback(error);

                        return;
                    }

                    callback();
                }
            );
        }
    );
}

workflow_load.formatting = function (workflow, callback) {
    var that = this;

    var cmd = '/sbin/dumpe2fs ' + this.ccontainer.get('mount.device');

    this.logger.silly(
        'volume/aws-ec2-ebs/formatting/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (!error) {
                callback();

                return;
            }

            var args = that.ccontainer.get('mkfs.args');
            var cmd = '/sbin/mkfs -t "' + that.ccontainer.get('mkfs.type') + '" ' + Object.keys(args).map(function (v) { return args[v]; }).join(' ') + ' ' + that.ccontainer.get('mount.device');

            that.logger.silly(
                'volume/aws-ec2-ebs/formatting/exec',
                cmd
            );

            child_process.exec(
                cmd,
                function (error, stdout, stderr) {
                    if (error) {
                        callback(error);

                        return;
                    }

                    callback();
                }
            );
        }
    );
}

workflow_load.mount_path = function (workflow, callback) {
    var that = this;

    var cmd = 'cat /proc/mounts | grep ' + that.ccontainer.get('mount.device');

    that.logger.silly(
        'volume/aws-ec2-ebs/mount-path/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (!error) {
                callback();

                return;
            }

            var p = that.ccontainer.get('mount.path');

            recursiveMkdir(p);

            var cmd = '/bin/mount ' + that.ccontainer.get('mount.device') + ' ' + p;

            that.logger.silly(
                'volume/aws-ec2-ebs/mount-path/exec',
                cmd
            );

            child_process.exec(
                cmd,
                function (error, stdout, stderr) {
                    if (error) {
                        callback(error);

                        return;
                    }

                    callback();
                }
            );
        }
    );
}

workflow_load.load_aws_env = function (workflow, callback) {
    var that = this;

    var data = [];

    var req = http.request(
        {
            host : '169.254.169.254',
            path : '/latest/dynamic/instance-identity/document'
        },
        function (res) {
            res.setEncoding('utf8');
            res.on(
                'data',
                function (chunk) {
                    data.push(chunk);
                }
            );
            res.on(
                'end',
                function () {
                    that.apiInstance = JSON.parse(data.join(''));
                    that.apiClient = new AWS.EC2(
                        {
                            region : that.apiInstance.region
                        }
                    );

                    callback();
                }
            );
        }
    );

    req.on(
        'error',
        function (error) {
            callback(error);
        }
    );

    req.end();
}

workflow_load.aws_mount = function (workflow, callback) {
    var that = this;

    function checkLocalAvailability() {
        that.logger.silly(
            'volume/aws-ec2-ebs/wait-until/local',
            'checking...'
        );

        child_process.exec(
            '/sbin/fdisk -l ' + that.ccontainer.get('mount.device') + ' | /bin/grep ' + that.ccontainer.get('mount.device'),
            function (error, stdout, stderr) {
                if (error) {
                    that.logger.silly(
                        'volume/aws-ec2-ebs/wait-until/local',
                        'not yet'
                    );

                    setTimeout(checkLocalAvailability, 2000);

                    return;
                }

                that.logger.silly(
                    'volume/aws-ec2-ebs/wait-until/local',
                    'available'
                );

                if (that.apiVolumeNeedsTagging) {
                    that.apiClient.createTags(
                        {
                            Resources : [ that.apiVolume.VolumeId ],
                            Tags : [
                                {
                                    Key : 'Environment',
                                    Value : that.ccontainer.get('name.environment')
                                },
                                {
                                    Key : 'Service',
                                    Value : that.ccontainer.get('name.service')
                                },
                                {
                                    Key : 'Name',
                                    Value : that.ccontainer.get('name.role')
                                }
                            ]
                        },
                        function (error, result) {
                            if (error) {
                                callback(error);

                                return;
                            }

                            that.apiVolumeNeedsTagging = false;

                            callback();
                        }
                    )
                } else {
                    callback();
                }
            }
        );
    }

    this.apiClient.attachVolume(
        {
            VolumeId : this.apiVolume.VolumeId,
            InstanceId : this.apiInstance.instanceId,
            Device : devicemap.ubuntu[this.ccontainer.get('mount.device')]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            waitForVolumeStatus.call(
                that,
                'in-use',
                checkLocalAvailability
            );
        }
    );
}

workflow_load.check = function (workflow, callback) {
    var cmd = '/sbin/fdisk -l "' + this.ccontainer.get('mount.device') + '" | /bin/grep "' + this.ccontainer.get('mount.device') + '"';

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (error) {
                workflow.unshiftStep(
                    'find-volume',
                    workflow_load.find_volume
                );
            } else {
                workflow.unshiftStep(
                    'verify',
                    workflow_load.check_verify
                );
            }

            callback();
        }
    );
}

workflow_load.check_verify = function (workflow, callback) {
    var that = this;

    this.apiClient.describeVolumes(
        {
            Filters : [
                {
                    Name : 'attachment.instance-id',
                    Values : [ this.apiInstance.instanceId ]
                },
                {
                    Name: 'attachment.device',
                    Values : [ devicemap.ubuntu[this.ccontainer.get('mount.device')] ]
                }
            ]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            var volume = result.Volumes.pop();

            if (!volume) {
                callback(new Error('A volume does not seem to be attached.'));

                return;
            }

            var tags = remapTags(volume.Tags);

            if ((that.ccontainer.get('name.environment') != tags['Environment'])
                || (that.ccontainer.get('name.service') != tags['Service'])
                || (that.ccontainer.get('name.role') != tags['Name'])
            ) {
                callback(new Error('Device ' + that.ccontainer.get('mount.device') + ' already has ' + volume.VolumeId + ' mounted.'));

                return;
            }

            callback();
        }
    );
}

workflow_load.find_volume = function (workflow, callback) {
    var that = this;

    this.apiClient.describeVolumes(
        {
            Filters : [
                {
                    Name : 'availability-zone',
                    Values : [ this.apiInstance.availabilityZone ]
                },
                {
                    Name : 'status',
                    Values : [ 'available' ]
                },
                {
                    Name : 'tag:Environment',
                    Values : [ this.ccontainer.get('name.environment') ]
                },
                {
                    Name : 'tag:Service',
                    Values : [ this.ccontainer.get('name.service') ]
                },
                {
                    Name : 'tag:Name',
                    Values : [ this.ccontainer.get('name.role') ]
                }
            ]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            var volume = result.Volumes.pop();

            if (volume) {
                that.apiVolume = volume;

                workflow.unshiftStep(
                    'mount',
                    workflow_load.aws_mount
                );
            } else {
                workflow.unshiftStep(
                    'create-volume',
                    workflow_load.create_volume
                );
            }

            callback();
        }
    );
};

workflow_load.create_volume = function (workflow, callback) {
    var that = this;

    var args = {
        AvailabilityZone : this.apiInstance.availabilityZone
    };

    if (null !== this.ccontainer.get('volume.size', null)) {
        args.Size = this.ccontainer.get('volume.size');
    }

    if (null !== this.ccontainer.get('volume.snapshot_id', null)) {
        args.SnapshotId = this.ccontainer.get('volume.snapshot_id');
    }

    if (null !== this.ccontainer.get('volume.type', null)) {
        args.VolumeType = this.ccontainer.get('volume.type');
    }

    if (null !== this.ccontainer.get('volume.iops', null)) {
        args.Iops = this.ccontainer.get('volume.iops');
    }

    this.apiClient.createVolume(
        args,
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            that.apiVolume = result;
            that.apiVolumeNeedsTagging = true;

            that.logger.silly(
                'volume/aws-ec2-ebs/create-volume',
                'created ' + result.VolumeId
            );

            workflow.unshiftStep(
                'mount',
                workflow_load.aws_mount
            );

            waitForVolumeStatus.call(that, 'available', callback);
        }
    );
}

// --

function recursiveMkdir(p) {
    var pa = 'string' == typeof p ? path.normalize(p).split(path.sep) : p;

    if (2 < pa.length) {
        recursiveMkdir(pa.slice(0, -1));
    }

    var ps = pa.join(path.sep);

    if (!fs.existsSync(ps)) {
        fs.mkdirSync(ps, '0700');
    }
}

function remapTags(tags) {
    var remap = {};

    tags.forEach(
        function (v) {
            remap[v.Key] = v.Value;
        }
    );

    return remap;
}

function waitForVolumeStatus (status, callback) {
    var that = this;

    this.logger.silly(
        'volume/aws-ec2-ebs/wait-until/aws-' + status,
        'checking...'
    );

    this.apiClient.describeVolumes(
        {
            VolumeIds : [
                this.apiVolume.VolumeId
            ]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            that.logger.silly(
                'volume/aws-ec2-ebs/wait-until/aws-' + status,
                result.Volumes[0].State
            );

            if (status == result.Volumes[0].State) {
                callback();
            } else {
                setTimeout(
                    function () {
                        waitForVolumeStatus.call(that, status, callback);
                    },
                    2000
                );
            }
        }
    );
}

// --

module.exports = {
    load : workflow_load
};
