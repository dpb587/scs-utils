var uuid = require('node-uuid');

function Socket(service, socket, options, logger) {
    var that = this;

    this.id = uuid.v4();
    this.service = service;

    this.raw = socket;
    this.session = null;

    this.createdAt = new Date();

    this.timeoutRecvHandle = null;
    this.timeoutSendHandle = null;

    this.activeLocal = true;
    this.activeRemote = true;

    this.logger = logger;

    this.raw.setEncoding('utf8');

    var dataBuffer = [];

    this.raw.on('close', function () {
        that.logger.verbose(
            'socket#' + that.id,
            'connection closed'
        );

        that.activeRemote = false;

        clearInterval(that.timeoutSendHandle);
        clearTimeout(that.timeoutRecvHandle);
    });
    this.raw.on('data', function (data) {
        var data = data.replace(/\r\n/g, '\n');
        that.logger.silly(
            'socket#' + that.id + '/recv',
            data
        );

        dataBuffer.push(data);

        if (-1 < data.indexOf('\n')) {
            try {
                dataBuffer = [ that.handleDataBuffer(dataBuffer.join('')) ];
            } catch (e) {
                that.write('e ' + JSON.stringify({ code : e.code, message : e.message }) + '\n');

                that.logger.error('socket#' + that.id + '/error/sent', e.code + ': ' + e.message);
                that.logger.info(e.stack);
            }
        }
    });

    this.timeoutSendHandle = setInterval(this.sendHeartbeat.bind(this), 25000);
}

Socket.prototype.resetTimeoutRecv = function () {
    var that = this;

    clearTimeout(this.timeoutRecvHandle);
    this.timeoutRecvHandle = setTimeout(
        function () {
            if (!that.activeRemote || !that.activeLocal) {
                return;
            }

            that.activeLocal = false;

            that.logger.silly(
                'socket#' + that.id + '/heartbeat',
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

Socket.prototype.bindSession = function (session) {
    var that = this;

    this.session = session;
    this.session.bindSocket(this);

    this.logger.verbose(
        'socket#' + this.id + '/session',
        'bound to ' + session.id
    );

    if (this.session.queuedWrites) {
        process.nextTick(
            function () {
                that.session.queuedWrites.forEach(
                    function (data) {
                        that.write(data);
                    }
                );

                that.session.queuedWrites = [];
            }
        );
    }
}

Socket.prototype.unbindSession = function () {
    this.session.unbindSocket();
    this.session = null;

    this.logger.verbose(
        'socket#' + this.id + '/session',
        'unbound'
    );
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
        this.session.recvResult(parsed[1], JSON.parse(parsed[2]));
    } else if (parsed = raw.match(/^c:([^ ]+) ([^ ]+)( ([^ ]+))?$/)) {
        this.session.recvCommand(parsed[1], parsed[2], (parsed[4] && parsed[4].length) ? JSON.parse(parsed[4]) : {});
        this.resetTimeoutRecv();
    } else if (parsed = raw.match(/^e (.+)$/)) {
        var error = JSON.parse(parsed[1]);

        this.logger.error('socket#' + this.id + '/error/recv', e.code + ': ' + e.message);
    } else {
        throw new Error('Unrecognized message format.');
    }

    return this.handleDataBuffer(remainder);
}

Socket.prototype.end = function () {
    this.logger.silly(
        'socket#' + this.id,
        'closing connection...'
    );

    this.raw.end()
}

Socket.prototype.write = function (data) {
    this.logger.silly(
        'socket#' + this.id + '/send',
        data
    );

    this.raw.write(data);
};

module.exports = Socket;
