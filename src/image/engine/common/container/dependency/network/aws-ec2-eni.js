var child_process = require('child_process');
var fs = require('fs');
var http = require('http');
var path = require('path');

var AWS = require('aws-sdk');
var netmask = require('netmask');

var utilfs = require('../../../../../../util/fs');

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

    if (fs.existsSync('/etc/network/interfaces.d/' + this.ccontainer.get('attach.device') + '.cfg')) {
        workflow.unshiftStep(
            'start-interface',
            workflow_load.start_interface
        );

        callback();

        return;
    }

    var block = new netmask.Netmask(this.apiSubnet.CidrBlock);

    var cmd = [];
    cmd.push('/bin/echo "# aws eni-' + this.ccontainer.get('network.eni') + '"');
    cmd.push('/bin/echo "auto ' + this.ccontainer.get('attach.device') + '"');
    cmd.push('/bin/echo "iface ' + this.ccontainer.get('attach.device') + ' inet static"');
    cmd.push('/bin/echo "    network ' + block.base + '"');
    cmd.push('/bin/echo "    address ' + this.apiNetworkInterface.PrivateIpAddress + '"');
    cmd.push('/bin/echo "    netmask ' + block.mask + '"');
    cmd.push('/bin/echo "    broadcast ' + block.broadcast + '"');
    cmd.push('/bin/echo "    gateway ' + block.first + '"');
    //cmd.push('/bin/echo "    post-up ip route del ' + block.base + '/' + block.bitmask + ' dev ' + this.ccontainer.get('attach.device') + ' table main || true"');
    cmd.push('/bin/echo "    post-up ip route add ' + block.base + '/' + block.bitmask + ' dev ' + this.ccontainer.get('attach.device') + ' proto kernel scope link src ' + this.apiNetworkInterface.PrivateIpAddress + ' table ' + this.ccontainer.get('attach.device') + 'route || true"');
    cmd.push('/bin/echo "    post-up ip route add default via ' + block.first + ' dev ' + this.ccontainer.get('attach.device') + ' table ' + this.ccontainer.get('attach.device') + 'route || true"');
//    cmd.push('/bin/echo "    up ip rule add to ' + this.apiNetworkInterface.PrivateIpAddress + ' lookup ' + this.ccontainer.get('attach.device') + 'route priority ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '0"');
    cmd.push('/bin/echo "    post-up ip rule add from ' + this.apiNetworkInterface.PrivateIpAddress + ' iif ' + this.ccontainer.get('attach.device') + ' lookup ' + this.ccontainer.get('attach.device') + 'route priority ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '0 || true"');
    cmd.push('/bin/echo "    post-up ip rule add to ' + block.base + '/' + block.bitmask + ' iif lo lookup eth0route priority ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '1 || true"');
//    cmd.push('/bin/echo "    up ip rule add to ' + block.base + '/' + block.mask + ' lookup eth0route priority ' + (1050 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '0"');
//    cmd.push('/bin/echo "    down ip rule del to ' + block.base + '/' + block.mask + ' lookup eth0route priority ' + (1050 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '0"');
    cmd.push('/bin/echo "    post-up ip rule del to ' + block.base + '/' + block.bitmask + ' iif lo lookup eth0route priority ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '1 || true"');
    cmd.push('/bin/echo "    pre-down ip rule del from ' + this.apiNetworkInterface.PrivateIpAddress + ' iif ' + this.ccontainer.get('attach.device') + ' lookup ' + this.ccontainer.get('attach.device') + 'route priority ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '0 || true"');
//    cmd.push('/bin/echo "    down ip rule del to ' + this.apiNetworkInterface.PrivateIpAddress + ' lookup ' + this.ccontainer.get('attach.device') + 'route priority ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '0"');
    cmd.push('/bin/echo "    pre-down ip route del default via ' + block.first + ' dev ' + this.ccontainer.get('attach.device') + ' table ' + this.ccontainer.get('attach.device') + 'route || true"');
    cmd.push('/bin/echo "    pre-down ip route del ' + block.base + '/' + block.bitmask + ' dev ' + this.ccontainer.get('attach.device') + ' proto kernel scope link src ' + this.apiNetworkInterface.PrivateIpAddress + ' table ' + this.ccontainer.get('attach.device') + 'route || true"');

    // cmd.push('/bin/echo "    post-up ip route add ' + this.apiNetworkInterface.PrivateIpAddress + ' dev ' + this.ccontainer.get('attach.device') + ' src ' + this.apiNetworkInterface.PrivateIpAddress + ' table ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '"');
    // cmd.push('/bin/echo "    post-up ip route add default via ' + block.first + ' dev ' + this.ccontainer.get('attach.device') + ' table ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + '"');
    // cmd.push('/bin/echo "    post-up ip rule add from ' + this.apiNetworkInterface.PrivateIpAddress + '/32 table ' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + ' priority 1024"');
//    cmd.push('/bin/echo "    up ip route flush cache"');

    cmd = '( ' + cmd.join(' ; ') + ' ) >> /etc/network/interfaces.d/' + this.ccontainer.get('attach.device') + '.cfg';

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

    var cmd = 'grep ' + this.ccontainer.get('attach.device') + 'route /etc/iproute2/rt_tables > /dev/null || echo "' + (50 + parseInt(devicemap.ubuntu[this.ccontainer.get('attach.device')], 10)) + ' ' + this.ccontainer.get('attach.device') + 'route" >> /etc/iproute2/rt_tables';

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
    
    var cmd = 'ifup ' + this.ccontainer.get('attach.device');

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
            'grep -q ^1$ /sys/class/net/' + that.ccontainer.get('attach.device') + '/carrier 2>/dev/null',
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
            DeviceIndex : devicemap.ubuntu[this.ccontainer.get('attach.device')]
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
                    Values : [ devicemap.ubuntu[this.ccontainer.get('attach.device')] ]
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
                callback(new Error('Device ' + that.ccontainer.get('attach.device') + ' already has ' + networkInterface.NetworkInterfaceId + ' attached.'));

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
