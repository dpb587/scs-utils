var Workflow = require('../../../../../../../util/workflow');
var AwsEc2EbsCommon = require('../../../../../common/container/dependency/volume/aws-ec2-ebs');

// --

function Volume(id, cimage, ccontainer, logger) {
    this.id = id;
    this.cimage = cimage;
    this.ccontainer = ccontainer;
    this.logger = logger;

    this.apiClient = null;
    this.apiInstance = null;
    this.apiVolume = null;
    this.apiVolumeNeedsTagging = false;
}


Volume.prototype.onContainerLoad = function (steps, callback, container) {
    var workflow = new Workflow(this, this.logger, 'aws-ec2-ebs');

    workflow.pushStep('load-aws-env', AwsEc2EbsCommon.load.load_aws_env);
    workflow.pushStep('check', AwsEc2EbsCommon.load.check);
    workflow.pushStep('formatting', AwsEc2EbsCommon.load.formatting);
    workflow.pushStep('mount-path', AwsEc2EbsCommon.load.mount_path);

    if (this.ccontainer.get('mount.fstab')) {
        workflow.pushStep('fstab', AwsEc2EbsCommon.load.mount_fstab);
    }

    workflow.run(
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            container.env.setVolume(this.id, this.ccontainer.get('mount.path'));

            callback();
        }.bind(this)
    );
}

Volume.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Volume.prototype.onContainerStarted = function (steps, callback, container) {
    callback();
}

Volume.prototype.onContainerStopped = function (steps, callback, container) {
    callback();
}

Volume.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Volume.prototype.onContainerUnload = function (steps, callback, container) {
    // @todo

    callback();
};

// --

module.exports = Volume;
