var assert = require('assert');
var net = require('net');
var RegistryService = require('../../../../../src/disco/registry/service');
var TcpService = require('../../../../../src/disco/service/tcp/server/service');

var logger = require('npmlog');
logger.level = 'silly';

function startSecondSocket (tcp, first, firstTriggers) {
    var ids = {};
    var second = net.createConnection(
        {
            host : '127.0.0.1',
            port : tcp.raw.address().port
        },
        function () {
            second.write('c:1 registry.join\n');
        }
    );

    var readSteps = [
        function (data) {
            var match = /r:1 {"result":{"id":"([^"]+)"}}\n/.exec(data);
            if (!match) throw Error('Unexpected response: ' + data);

            second.write('c:2 provision.add {"environment":"dev","service":"blog","role":"mysql-master","endpoint":"mysql","address":{"host":"192.0.2.38","port":12392},"attributes":{"zone":"one"}}\n');
        },
        function (data) {
            var match = /r:2 {"result":{"id":"([^"]+)"}}\n/.exec(data);
            if (!match) throw Error('Unexpected response: ' + data);

            ids.provision = match[1];
        },
        function (data) {
            var match = /r:3 {"result":{"timed_out":false}}\n/.exec(data);
            if (!match) throw Error('Unexpected response: ' + data);

            second.end();

            firstTriggers.shutdown();
        }
    ];

    second.on('data', function (data) {
        readSteps.shift()(data);
    });

    return {
        removeProvision : function () {
            second.write('c:3 registry.leave\n');

            // first client should receive notification
        }
    };
}

describe('disco/service/tcp/scenario/simple-provision-require', function () {
    it('runs', function (done) {
        this.timeout(5000);

        var registry = new RegistryService(null, logger);
        var tcp = new TcpService(
            registry,
            {
                listen : {
                    port : 0
                }
            },
            logger
        );

        tcp.start(
            function () {
                var ids = {};
                var first = net.createConnection(
                    {
                        host : '127.0.0.1',
                        port : tcp.raw.address().port
                    },
                    function () {
                        first.write('c:1 registry.join\n');
                    }
                );
                var secondTriggers;
                var firstTriggers = {
                    // second client terminated
                    // now: start dropping
                    shutdown : function () {
                        first.write('c:6 provision.drop {"id":"' + ids.provision + '"}\n');
                    }
                }

                var readSteps = [
                    // registered
                    // now: add provision
                    function (data) {
                        var match = /r:1 {"result":{"id":"([^"]+)"}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        first.write('c:2 provision.add {"environment":"dev","service":"blog","role":"wordpress","endpoint":"http","address":{"host":"192.0.2.38","port":12391},"attributes":{"zone":"one"}}\n');
                    },
                    // added provision
                    // now: add requirement
                    function (data) {
                        var match = /r:2 {"result":{"id":"([^"]+)"}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        ids.provision = match[1];

                        first.write('c:3 requirement.add {"environment":"dev","service":"blog","role":"mysql-master","endpoint":"mysql","attributes":{"zone":"one"}}\n');
                    },
                    // added requirement
                    // now: start second client
                    function (data) {
                        var match = /r:3 {"result":{"id":"([^"]+)","endpoints":\[\]}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        ids.requirement1 = match[1];

                        secondTriggers = startSecondSocket(tcp, first, firstTriggers);
                    },
                    // second client added a provision we wanted
                    // now: drop our requirement
                    function (data) {
                        var match = /c:([^ ]+) requirement.changed {"id":"([^"]+)","action":"add","provision":{"id":"([^"]+)","address":{"host":"192.0.2.38","port":12392},"attributes":{"zone":"one"}}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        first.write('r:' + match[1] + ' {"result":{"ack":true}}\n');

                        first.write('c:4 requirement.drop {"id":"' + ids.requirement1 + '"}\n');
                    },
                    // requirement dropped
                    // now: add our requirement back
                    function (data) {
                        var match = /r:4 {"result":{"ack":true}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        first.write('c:5 requirement.add {"environment":"dev","service":"blog","role":"mysql-master","endpoint":"mysql","attributes":{"zone":"one"}}\n');
                    },
                    // requirement added
                    // now: second client should remove their provision
                    function (data) {
                        var match = /r:5 {"result":{"id":"([^"]+)","endpoints":\[{"id":"([^"]+)","address":{"host":"192.0.2.38","port":12392},"attributes":{"zone":"one"}}\]}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        ids.requirement2 = match[1];

                        secondTriggers.removeProvision();
                    },
                    // second client dropped a provision we were using
                    // now: drop our provision handle so second client can end
                    function (data) {
                        var match = /c:([^ ]+) requirement.changed {"id":"([^"]+)","action":"drop","provision":{"id":"([^"]+)","address":{"host":"192.0.2.38","port":12392},"attributes":{"zone":"one"}}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        first.write('r:' + match[1] + ' {"result":{"success":true}}\n');
                    },
                    // we dropped our provision
                    // now: drop our requirement
                    function (data) {
                        var match = /r:6 {"result":{"timed_out":false}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        first.write('c:7 requirement.drop {"id":"' + ids.requirement2 + '"}\n');
                    },
                    // we dropped our requirement
                    // now: leave the registry
                    function (data) {
                        var match = /r:7 {"result":{"ack":true}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        first.write('c:8 registry.leave\n');
                    },
                    // we left the registry
                    // now: finish test
                    function (data) {
                        var match = /r:8 {"result":{"timed_out":false}}\n/.exec(data);
                        if (!match) throw Error('Unexpected response: ' + data);

                        first.end();
                        tcp.stop(
                            function () {
                                done();
                            }
                        );
                    }
                ];

                first.on('data', function (data) {
                    readSteps.shift()(data);
                });
            }
        );
    })
});