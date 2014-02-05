var events = require('events');
var Socket = require('../../../../src/disco/service/tcp/socket');

var logger = require('npmlog');
logger.level = 'silent';

module.exports.createMockSocket = function (options) {
    var raw = new events.EventEmitter();
    raw.setEncoding = function () {}
    raw.write = function (data) {
        this.emit('_write', data);
    };

    options = options || {};
    options.heartbeatSend = 'heartbeatSend' in options ? options.heartbeatSend : false;

    return new Socket(null, raw, options, logger);
}
