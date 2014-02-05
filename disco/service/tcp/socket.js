var uuid = require('node-uuid');
var events = require('events');
var util = require('util');

function Socket(service, raw, options, logger) {
    var that = this;

    this.id = uuid.v4();
    this.service = service;

    this.raw = socket;

    this.createdAt = new Date();

    this.heartbeatRecvHandle = null;
    this.heartbeatSendHandle = null;

    this.activeLocal = true;
    this.activeRemote = true;

    this.logger = logger;
    this.loggerTopic = 'server/tcp/socket#' + this.id;

    this.raw.setEncoding('utf8');

    var dataBuffer = [];

    this.raw.on('close', function () {
        that.logger.verbose(
            that.loggerTopic,
            'connection closed'
        );

        that.activeRemote = false;

        clearInterval(that.heartbeatSendHandle);
        clearTimeout(that.heartbeatRecvHandle);
    });
    this.raw.on('data', function (data) {
        var data = data.replace(/\r\n/g, '\n');

        that.logger.silly(
            that.loggerTopic + '/recv',
            data
        );

        dataBuffer.push(data);

        if (-1 < data.indexOf('\n')) {
            try {
                dataBuffer = [ that.handleDataBuffer(dataBuffer.join('')) ];
            } catch (error) {
                that.sendError(error);
            }
        }
    });

    this.heartbeatSendHandle = setInterval(this.sendHeartbeat.bind(this), 25000);

    this.logger.silly(
        this.loggerTopic,
        'created'
    );
}

util.inherits(Socket, events.EventEmitter);

Socket.prototype.resetTimeoutRecv = function () {
    var that = this;

    clearTimeout(this.heartbeatRecvHandle);
    this.heartbeatRecvHandle = setTimeout(
        function () {
            if (!that.activeRemote || !that.activeLocal) {
                return;
            }

            that.activeLocal = false;

            that.logger.silly(
                that.loggerTopic + '/heartbeat',
                'timeout'
            );

            that.end();
        },
        60000
    );
}

Socket.prototype.sendHeartbeat = function () {
    this.write('\n');
}

Socket.prototype.handleDataBuffer = function (buffer) {
    var thru = buffer.indexOf('\n');

    if (-1 == thru) {
        return buffer;
    }

    var raw = buffer.substring(0, thru);
    var remainder = buffer.substring(thru + 1);
    var parsed;

    if (0 == raw.length) {
        this.resetTimeoutRecv();
    } else if (parsed = raw.match(/^r:([^ ]+) ([^ ]+)$/)) {
        this.emit('result', parsed[1], JSON.parse(parsed[2]));
    } else if (parsed = raw.match(/^c:([^ ]+) ([^ ]+)( ([^ ]+))?$/)) {
        this.emit('command', parsed[1], parsed[2], (parsed[4] && parsed[4].length) ? JSON.parse(parsed[4]) : {});
    } else if (parsed = raw.match(/^e (.+)$/)) {
        this.emit('error', JSON.parse(parsed[1]));
    } else {
        throw new Error('Unrecognized message format.');
    }

    this.resetTimeoutRecv();

    return this.handleDataBuffer(remainder);
}

Socket.prototype.sendError(error) {
    this.write('e ' + JSON.stringify({ name : error.name, message : error.message }) + '\n');

    this.logger.error(
        this.loggerTopic + '/error/sent',
        error.toString()
    );
    this.logger.info(
        this.loggerTopic + '/error/sent',
        error.stack
    );
}

Socket.prototype.sendResult(reqid, error, result) {
    if (error) {
        socket.write('r:' + reqid + ' ' + JSON.stringify({ error : { name : error.name, message : error.message } }) + '\n');
    } else {
        socket.write('r:' + reqid + ' ' + JSON.stringify({ result : result }) + '\n');
    }
}

Socket.prototype.sendCommand(reqid, command, data) {
    this.write('c:' + reqid + ' ' + command + ' ' + JSON.stringify(data) + '\n');
}

Socket.prototype.end = function () {
    this.logger.silly(
        this.loggerTopic,
        'closing connection...'
    );

    this.raw.end()
}

Socket.prototype.write = function (data) {
    this.logger.silly(
        this.loggerTopic + '/send',
        data
    );

    this.raw.write(data);
};

module.exports = Socket;
