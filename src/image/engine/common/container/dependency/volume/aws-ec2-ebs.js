var child_process = require('child_process');
var fs = require('fs');
var http = require('http');

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

workflow_load.formatting = function (workflow, callback) {
    child_process.spawn(
        '/sbin/dumpe2fs ' + this.ccontainer.get('mount.device'),
        function (error, stdout, stderr) {
            if (!error) {
                callback();

                return;
            }

            child_process.spawn(
                '/sbin/mkfs -t "' + that.ccontainer.get('mkfs.type') + '" ' + that.ccontainer.get('mkfs.args') + ' ' + that.ccontainer.get('mount.device'),
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
    child_process.spawn(
        '/bin/cat /proc/mounts | /bin/grep ' + that.ccontainer.get('mount.device'),
        function (error, stdout, stderr) {
            if (!error) {
                callback();

                return;
            }

            child_process.spawn(
                '/bin/mount ' + that.ccontainer.get('mount.device') + ' ' + that.ccontainer.get('mount.path'),
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

    this.apiClient = new AWS.EC2();

    var req = http.request(
        {
            host : '169.254.169.254',
            path : '/latest/dynamic/instance-identity/document'
        },
        function (res) {
            that.apiInstance = JSON.parse(res);

            callback();
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
                            Tags : {
                                Environment : that.ccontainer.get('name.environment'),
                                Service : that.ccontainer.get('name.service'),
                                Role : that.ccontainer.get('name.role')
                            }
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

            waitForVolumeStatus(
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
                    'lookup',
                    workflow_load.aws_lookup
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
    this.apiClient.describeVolumes(
        {
            Filters : {
                'attachment.instance-id' : this.apiInstance.instanceId,
                'attachment.device' : devicemap.ubuntu[this.ccontainer.get('mount.device')]
            }
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
        }
    );
}

workflow_load.aws_lookup = function (workflow, callback) {
    var that = this;
    var filters = {
        'availability-zone' : this.apiInstance.availabilityZone,
        'status' : 'available',
        'tag:Environment' : this.ccontainer.get('name.environment'),
        'tag:Service' : this.ccontainer.get('name.service'),
        'tag:Name' : this.ccontainer.get('name.role')
    };

    this.apiClient.describeVolumes(
        {
            Filters : filters
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
                    workflow_load.mount
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

    this.apiClient.createVolume(
        {
            Size : this.ccontainer.get('volume.size', null),
            SnapshotId : this.ccontainer.get('volume.snapshot_id', null),
            AvailabilityZone : this.apiInstance.availabilityZone,
            VolumeType : this.ccontainer.get('volume.type'),
            Iops : this.ccontainer.get('volume.iops')
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            this.apiVolume = result;
            this.apiVolumeNeedsTagging = true;

            that.logger.silly(
                'volume/aws-ec2-ebs/create-volume',
                'created ' + result.VolumeId
            );

            workflow.unshiftStep(
                'mount',
                workflow_load.mount
            );

            waitForVolumeStatus('available', callback);
        }
    );
}

// --

function waitForVolumeStatus(status, callback) {
    that.logger.silly(
        'volume/aws-ec2-ebs/wait-until/aws-' + status,
        'checking...'
    );

    that.apiClient.describeVolumes(
        {
            VolumeIds : [
                that.apiVolume.VolumeId
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
                        waitForVolumeStatus(status, callback);
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
