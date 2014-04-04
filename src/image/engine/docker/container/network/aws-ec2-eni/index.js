var child_process = require('child_process');

var Workflow = require('../../../../../../util/workflow');
var AwsEc2EbsCommon = require('../../../../common/container/network/aws-ec2-eni');

// --

function Network (ccontainer, logger) {
    this.ccontainer = ccontainer;
    this.logger = logger;

    this.apiClient = null;
    this.apiInstance = null;
    this.apiNetworkInterface = null;
    this.proxies = [];
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

            container.env.setNetworkMode('physical');

            container.env.setNetworkInternal(
                this.ccontainer.get('container.device'),
                this.apiNetworkInterface.PrivateIpAddress,
                this.apiSubnetBlock.bitmask,
                this.apiSubnetBlock.first,
                this.apiNetworkInterface.MacAddress
            );

            container.env.setNetworkExternal(
                this.ccontainer.get('host.device'),
                this.apiNetworkInterface.PrivateIpAddress,
                this.apiSubnetBlock.bitmask,
                this.apiSubnetBlock.first,
                this.apiNetworkInterface.MacAddress
            );

            callback();
        }.bind(this)
    );
}

Network.prototype.onContainerUp = function (steps, callback, container) {
    var that = this;

    if ('eth0' == container.env.getNetworkInternal().name) {
        callback();

        return;
    }

    // this doesn't currently work
    // presumably AWS doesn't like the unrecognized container MACs?

    var cmd = '( ifdown -v ' + container.env.getNetworkExternal().name + ' || true ) && ' + __dirname + '/../../../../../../../bin/pipework ' + container.env.getNetworkExternal().name + ' -i ' + container.env.getNetworkInternal().name + ' ' + container.dockerContainerId + ' ' + container.env.getNetworkExternal().address + '/' + container.env.getNetworkExternal().bitmask;

    this.logger.verbose(
        'network/aws-ec2-eni/pipework/exec',
        cmd
    );

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (stdout) {
                that.logger.silly(
                    'network/aws-ec2-eni/pipework/stdout',
                    stdout
                );
            }

            if (stderr) {
                that.logger.silly(
                    'network/aws-ec2-eni/pipework/stderr',
                    stderr
                );
            }

            if (error) {
                that.logger.silly(
                    'network/aws-ec2-eni/pipework/exit',
                    error
                );

                callback(error);

                return;
            }

            callback();
        }
    );
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
