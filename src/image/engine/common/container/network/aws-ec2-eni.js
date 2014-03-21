var child_process = require('child_process');
var fs = require('fs');
var http = require('http');
var path = require('path');

var AWS = require('aws-sdk');
var netmask = require('netmask');

var utilfs = require('../../../../../util/fs');

// --

var devicemap = {
    ubuntu : {
        'eth0' : '0',
        'eth1' : '1',
        'eth2' : '2',
        'eth3' : '3',
        'eth4' : '4',
        'eth5' : '5',
        'eth6' : '6',
        'eth7' : '7'
    }
}

// --

var workflow_load = {};

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

workflow_load.add_interface = function (workflow, callback) {
    var that = this;

    if (fs.existsSync('/etc/network/interfaces.d/' + this.ccontainer.get('host.device') + '.cfg')) {
        workflow.unshiftStep(
            'start-interface',
            workflow_load.start_interface
        );

        callback();

        return;
    }

    var cmd = [];
    cmd.push('/bin/echo "# aws eni-' + this.ccontainer.get('network.eni') + '"');
    cmd.push('/bin/echo "iface ' + this.ccontainer.get('host.device') + ' inet manual"');
    cmd.push('/bin/echo "    # network ' + this.apiSubnetBlock.base + '"');
    cmd.push('/bin/echo "    # address ' + this.apiNetworkInterface.PrivateIpAddress + '"');
    cmd.push('/bin/echo "    # netmask ' + this.apiSubnetBlock.mask + '"');
    cmd.push('/bin/echo "    # broadcast ' + this.apiSubnetBlock.broadcast + '"');
    cmd.push('/bin/echo "    # gateway ' + this.apiSubnetBlock.first + '"');

    cmd.push('/bin/echo "    up ip addr add ' + this.apiNetworkInterface.PrivateIpAddress + '/' + this.apiSubnetBlock.bitmask + ' broadcast ' + this.apiSubnetBlock.last + ' dev ' + this.ccontainer.get('host.device') + ' label ' + this.ccontainer.get('host.device') + '"');
    cmd.push('/bin/echo "    up ip link set dev ' + this.ccontainer.get('host.device') + ' up"');

    cmd.push('/bin/echo "    up ip route add ' + this.apiSubnetBlock.base + '/' + this.apiSubnetBlock.bitmask + ' dev ' + this.ccontainer.get('host.device') + ' scope link src ' + this.apiNetworkInterface.PrivateIpAddress + ' table ' + this.ccontainer.get('host.device') + 'route"');
    cmd.push('/bin/echo "    up ip route add default via ' + this.apiSubnetBlock.first + ' dev ' + this.ccontainer.get('host.device') + ' table ' + this.ccontainer.get('host.device') + 'route || true"');
    cmd.push('/bin/echo "    up ip rule add from ' + this.apiNetworkInterface.PrivateIpAddress + ' lookup ' + this.ccontainer.get('host.device') + 'route priority ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('host.device')], 10)) + '0"');

    cmd.push('/bin/echo "    up ip route del ' + this.apiSubnetBlock.base + '/' + this.apiSubnetBlock.bitmask + ' dev ' + this.ccontainer.get('host.device') + ' table main"');

    cmd.push('/bin/echo "    down ip rule del from ' + this.apiNetworkInterface.PrivateIpAddress + ' lookup ' + this.ccontainer.get('host.device') + 'route priority ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('host.device')], 10)) + '0"');
    cmd.push('/bin/echo "    down ip route del default via ' + this.apiSubnetBlock.first + ' dev ' + this.ccontainer.get('host.device') + ' table ' + this.ccontainer.get('host.device') + 'route || true"');
    cmd.push('/bin/echo "    down ip route del ' + this.apiSubnetBlock.base + '/' + this.apiSubnetBlock.bitmask + ' dev ' + this.ccontainer.get('host.device') + ' scope link src ' + this.apiNetworkInterface.PrivateIpAddress + ' table ' + this.ccontainer.get('host.device') + 'route"');
    
    cmd.push('/bin/echo "    down ip link set dev ' + this.ccontainer.get('host.device') + ' down"');
    cmd.push('/bin/echo "    down ip addr del ' + this.apiNetworkInterface.PrivateIpAddress + '/' + this.apiSubnetBlock.bitmask + ' broadcast ' + this.apiSubnetBlock.last + ' dev ' + this.ccontainer.get('host.device') + '"');

    cmd = '( ' + cmd.join(' ; ') + ' ) >> /etc/network/interfaces.d/' + this.ccontainer.get('host.device') + '.cfg';

    if (cmd) {
        this.logger.verbose(
            'network/aws-ec2-eni/add-interface/cmd',
            cmd
        );
    }

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (stdout) {
                that.logger.silly(
                    'network/aws-ec2-eni/add-interface/stdout',
                    stdout
                );
            }

            if (stderr) {
                that.logger.verbose(
                    'network/aws-ec2-eni/add-interface/stderr',
                    stderr
                );
            }

            if (error) {
                callback(new Error('failed to add interface'));

                return;
            }

            workflow.unshiftStep(
                'start-interface',
                workflow_load.start_interface
            );

            callback();
        }
    );
}

workflow_load.add_iproute2table = function (workflow, callback) {
    var that = this;

    var cmd = 'grep ' + this.ccontainer.get('host.device') + 'route /etc/iproute2/rt_tables > /dev/null || echo "' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('host.device')], 10)) + ' ' + this.ccontainer.get('host.device') + 'route" >> /etc/iproute2/rt_tables';

    if (cmd) {
        this.logger.verbose(
            'network/aws-ec2-eni/add-iproute2-table/cmd',
            cmd
        );
    }

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (stdout) {
                that.logger.silly(
                    'network/aws-ec2-eni/add-iproute2-table/stdout',
                    stdout
                );
            }

            if (stderr) {
                that.logger.verbose(
                    'network/aws-ec2-eni/add-iproute2-table/stderr',
                    stderr
                );
            }

            if (error) {
                callback(new Error('failed to add interface'));

                return;
            }

            callback();
        }
    );
}

workflow_load.start_interface = function (workflow, callback) {
    var that = this;

    var block = new netmask.Netmask(this.apiSubnet.CidrBlock);
    
    var cmd = 'ifup ' + this.ccontainer.get('host.device');

    if (cmd) {
        that.logger.verbose(
            'network/aws-ec2-eni/start-interface/cmd',
            cmd
        );
    }

    child_process.exec(
        cmd,
        function (error, stdout, stderr) {
            if (stdout) {
                that.logger.silly(
                    'network/aws-ec2-eni/start-interface/stdout',
                    stdout
                );
            }

            if (stderr) {
                that.logger.verbose(
                    'network/aws-ec2-eni/start-interface/stderr',
                    stderr
                );
            }

            if (error) {
                callback(new Error('failed to start interface'));

                return;
            }

            callback();
        }
    );
}

workflow_load.aws_attach = function (workflow, callback) {
    var that = this;

    function checkLocalAvailability() {
        callback();
        return;
        that.logger.silly(
            'network/aws-ec2-eni/wait-until/local',
            'checking...'
        );

        child_process.exec(
            'grep -q ^1$ /sys/class/net/' + that.ccontainer.get('host.device') + '/carrier 2>/dev/null',
            function (error, stdout, stderr) {
                if (error) {
                    that.logger.silly(
                        'network/aws-ec2-eni/wait-until/local',
                        'not yet'
                    );

                    setTimeout(checkLocalAvailability, 2000);

                    return;
                }

                that.logger.silly(
                    'network/aws-ec2-eni/wait-until/local',
                    'available'
                );

                callback();
            }
        );
    }

    this.apiClient.attachNetworkInterface(
        {
            NetworkInterfaceId : this.ccontainer.get('network.eni'),
            InstanceId : this.apiInstance.instanceId,
            DeviceIndex : devicemap.ubuntu[this.ccontainer.get('host.device')]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            waitForAttachmentReady.call(
                that,
                'attached',
                checkLocalAvailability
            );
        }
    );
}

workflow_load.load_network_interface = function (workflow, callback) {
    var that = this;

    this.apiClient.describeNetworkInterfaces(
        {
            NetworkInterfaceIds : [
                this.ccontainer.get('network.eni')
            ]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            that.apiNetworkInterface = result.NetworkInterfaces[0];

            callback();
        }
    );
}

workflow_load.load_subnet = function (workflow, callback) {
    var that = this;

    this.apiClient.describeSubnets(
        {
            SubnetIds : [
                this.apiNetworkInterface.SubnetId
            ]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            that.apiSubnet = result.Subnets[0];
            that.apiSubnetBlock = new netmask.Netmask(that.apiSubnet.CidrBlock);

            callback();
        }
    );
}

workflow_load.check = function (workflow, callback) {
    var that = this;

    this.apiClient.describeNetworkInterfaces(
        {
            Filters : [
                {
                    Name : 'attachment.instance-id',
                    Values : [ this.apiInstance.instanceId ]
                },
                {
                    Name: 'attachment.device-index',
                    Values : [ devicemap.ubuntu[this.ccontainer.get('host.device')] ]
                }
            ]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            var networkInterface = result.NetworkInterfaces.pop();

            if (!networkInterface) {
                workflow.unshiftStep(
                    'attach',
                    workflow_load.aws_attach
                );
            } else if (that.ccontainer.get('network.eni') != networkInterface.NetworkInterfaceId) {
                callback(new Error('Device ' + that.ccontainer.get('host.device') + ' already has ' + networkInterface.NetworkInterfaceId + ' attached.'));

                return;
            }

            callback();
        }
    );
}

// --

function waitForAttachmentReady (status, callback) {
    var that = this;

    this.logger.silly(
        'network/aws-ec2-eni/wait-until/aws-' + status,
        'checking...'
    );

    this.apiClient.describeNetworkInterfaces(
        {
            NetworkInterfaceIds : [
                this.ccontainer.get('network.eni')
            ]
        },
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            that.logger.silly(
                'network/aws-ec2-eni/wait-until/aws-' + status,
                result.NetworkInterfaces[0].Attachment.Status
            );

            if (status == result.NetworkInterfaces[0].Attachment.Status) {
                callback();
            } else {
                setTimeout(
                    function () {
                        waitForAttachmentReady.call(that, status, callback);
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
