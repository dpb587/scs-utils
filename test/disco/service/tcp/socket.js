var assert = require('assert');
var TestUtilSocket = require('../_test/socket');

var logger = require('npmlog');
logger.level = 'silent';

describe('disco/service/tcp/socket', function () {
    describe('reads data stream', function () {
        it('accepts results', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.on('result', function (msgid, data) {
                assert.equal('0', msgid);
                assert.deepEqual({ result : { ack : true } }, data);

                done();
            });

            socket.raw.emit('data', 'r:0 {"result":{"ack":true}}\n');
        });

        it('accepts commands w/ args', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.on('command', function (msgid, command, args) {
                assert.equal('1', msgid);
                assert.equal('util.ping', command);
                assert.deepEqual({ reply : "hello" }, args);

                done();
            });

            socket.raw.emit('data', 'c:1 util.ping {"reply":"hello"}\n');
        });

        it('accepts commands w/o args', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.on('command', function (msgid, command, args) {
                assert.equal('2', msgid);
                assert.equal('util.ping', command);
                assert.deepEqual({}, args);

                done();
            });

            socket.raw.emit('data', 'c:2 util.ping\n');
        });

        it('accepts errors', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.on('error', function (error) {
                assert.equal(error.name, 'Error');
                assert.equal(error.message, 'testme');

                done();
            });

            socket.raw.emit('data', 'e {"name":"Error","message":"testme"}\n');
        });

        it('cleanly errors', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.raw.on('_write', function (data) {
                assert.equal(data, 'e {"name":"Error","message":"Unrecognized message format."}\n');

                done();
            });

            socket.raw.emit('data', 'strange input\n');
        });

        it('parses split packets', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.on('error', function (error) {
                assert.equal(error.name, 'Error');
                assert.equal(error.message, 'testme');

                done();
            });

            socket.raw.emit('data', 'e {"name":"Error",');
            socket.raw.emit('data', '"message":"testme"}\n');
        });

        it('parses combined packets', function (done) {
            var socket = TestUtilSocket.createMockSocket();
            var first = false;

            socket.on('error', function (error) {
                assert.equal(error.name, 'Error');
                assert.equal(error.message, 'testme');

                first = true;
            });

            socket.on('command', function (msgid, command, args) {
                assert.equal('2', msgid);
                assert.equal('util.ping', command);
                assert.deepEqual({}, args);

                assert.equal(first, true);
                done();
            });

            socket.raw.emit('data', 'e {"name":"Error","message":"testme"}\nc:2 util.ping\n');
        });
    })

    describe('writes data stream', function () {
        it('sends errors', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.raw.on('_write', function (data) {
                assert.equal(data, 'e {"name":"Error","message":"ohno"}\n');

                done();
            });

            socket.sendError(new Error('ohno'));
        });

        it('sends results w/ error)', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.raw.on('_write', function (data) {
                assert.equal(data, 'r:2 {"error":{"name":"Error","message":"grr"}}\n');

                done();
            });

            socket.sendResult('2', new Error('grr'));
        });

        it('sends results w/o error', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.raw.on('_write', function (data) {
                assert.equal(data, 'r:3 {"result":{"ack":true}}\n');

                done();
            });

            socket.sendResult('3', null, { ack : true });
        });

        it('sends commands w/ args', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.raw.on('_write', function (data) {
                assert.equal(data, 'c:4 util.ping {"reply":"works"}\n');

                done();
            });

            socket.sendCommand('4', 'util.ping', { reply : "works" });
        });

        it('sends commands w/o args', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.raw.on('_write', function (data) {
                assert.equal(data, 'c:5 util.ping\n');

                done();
            });

            socket.sendCommand('5', 'util.ping');
        });
    });

    describe('.sendHeartbeat', function () {
        it('works', function (done) {
            var socket = TestUtilSocket.createMockSocket();

            socket.raw.on('_write', function (data) {
                assert.equal(data, '\n');

                done();
            });

            socket.sendHeartbeat();
        });
    });
})
