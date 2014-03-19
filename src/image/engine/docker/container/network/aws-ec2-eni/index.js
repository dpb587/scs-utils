var Workflow = require('../../../../../../util/workflow');
var AwsEc2EbsCommon = require('../../../../common/container/dependency/network/aws-ec2-eni');

// --

function Network (ccontainer, logger) {
    this.ccontainer = ccontainer;
    this.logger = logger;

    this.apiClient = null;
    this.apiInstance = null;
    this.apiNetworkInterface = null;
}


Network.prototype.onContainerLoad = function (steps, callback, container) {
    var workflow = new Workflow(this, this.logger, 'aws-ec2-eni');

    workflow.pushStep('load-aws-env', AwsEc2EbsCommon.load.load_aws_env);
    workflow.pushStep('load-network-interface', AwsEc2EbsCommon.load.load_network_interface);
    workflow.pushStep('load-subnet', AwsEc2EbsCommon.load.load_subnet);
    workflow.pushStep('check', AwsEc2EbsCommon.load.check);

    workflow.pushStep('add-iproute2table', AwsEc2EbsCommon.load.add_iproute2table);
    workflow.pushStep('add-interface', AwsEc2EbsCommon.load.add_interface);

    workflow.run(
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            container.env.setNetworkExternal(null, this.apiNetworkInterface.PrivateIpAddress);

            callback();
        }.bind(this)
    );
}

Network.prototype.onContainerUp = function (steps, callback, container) {
    callback();
}

Network.prototype.onContainerStarted = function (steps, callback, container) {
    callback();
}

Network.prototype.onContainerStopped = function (steps, callback, container) {
    callback();
}

Network.prototype.onContainerDown = function (steps, callback, container) {
    callback();
}

Network.prototype.onContainerUnload = function (steps, callback, container) {
    // @todo

    callback();
};

// --

module.exports = Network;
