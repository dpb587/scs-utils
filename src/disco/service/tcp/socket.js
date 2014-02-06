var uuid = require('node-uuid');
var events = require('events');
var util = require('util');

function Socket(service, raw, context, options, logger) {
    var that = this;

    options = options || {};
    options.heartbeatRecv = 'heartbeatRecv' in options ? options.heartbeatRecv : 70000;
    options.heartbeatSend = 'heartbeatSend' in options ? options.heartbeatSend : 22000;
    this.options = options;

    this.id = uuid.v4();
    this.service = service;

    this.raw = raw;

    this.createdAt = new Date();

    this.heartbeatRecvHandle = null;
    this.heartbeatSendHandle = null;

    this.activeLocal = true;
    this.activeRemote = true;

    this.session = null;
    this.context = context;

    this.logger = logger;
    this.loggerTopic = 'server/tcp/socket#' + this.id;

    this.commands = service.commands;
    this.localCommandCallbacks = {};

    this.raw.setEncoding('utf8');

    var dataBuffer = '';

    this.raw.on('close', function () {
        that.logger.verbose(
            that.loggerTopic,
            'connection closed'
        );

        that.activeRemote = false;

        clearInterval(that.heartbeatSendHandle);
        clearTimeout(that.heartbeatRecvHandle);
    });
    this.raw.on('error', function (error) {
        that.logger.error(
            that.loggerTopic + '/error',
            error.name + ': ' + error.message
        );
        that.logger.info(
            that.loggerTopic + '/error',
            error.stack
        );
    })
    this.raw.on('data', function (data) {
        var data = data.replace(/\r\n/g, '\n');

        that.logger.silly(
            that.loggerTopic + '/recv',
            data
        );

        dataBuffer += data;
        var pos;

        while (-1 < (pos = dataBuffer.indexOf('\n'))) {
            var dataSegment = dataBuffer.substring(0, pos);
            dataBuffer = dataBuffer.substring(pos + 1);

            try {
                that.handleDataBuffer(dataSegment);
            } catch (error) {
                that.sendError(error);
            }
        }
    });

    if (this.options.heartbeatSend > 0) {
        this.heartbeatSendHandle = setInterval(
            this.sendHeartbeat.bind(this),
            this.options.heartbeatSend
        );
    }

    this.logger.silly(
        this.loggerTopic,
        'created'
    );
}

util.inherits(Socket, events.EventEmitter);

Socket.prototype.setSession = function (session) {
    this.session = session;
}

Socket.prototype.getSession = function () {
    return this.session;
}

Socket.prototype.hasSession = function () {
    return null !== this.session;
}

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

Socket.prototype.handleDataBuffer = function (raw) {
    var parsed;

    if (0 == raw.length) {
        // just a heartbeat
    } else if (parsed = raw.match(/^r:([^ ]+) ([^ ]+)$/)) {
        this.recvResult(parsed[1], JSON.parse(parsed[2]));
    } else if (parsed = raw.match(/^c:([^ ]+) ([^ ]+)( ([^ ]+))?$/)) {
        this.recvCommand(parsed[1], parsed[2], (parsed[4] && parsed[4].length) ? JSON.parse(parsed[4]) : {});
    } else if (parsed = raw.match(/^e (.+)$/)) {
        this.recvError(JSON.parse(parsed[1]));
    } else {
        throw new Error('Unrecognized message format.');
    }

    this.resetTimeoutRecv();
}

Socket.prototype.sendError = function (error) {
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

Socket.prototype.sendResult = function (reqid, error, result) {
    if (error) {
        this.write('r:' + reqid + ' ' + JSON.stringify({ error : { name : error.name, message : error.message } }) + '\n');
    } else {
        this.write('r:' + reqid + ' ' + JSON.stringify({ result : result }) + '\n');
    }
}

Socket.prototype.sendCommand = function (reqid, command, data) {
    this.write('c:' + reqid + ' ' + command + ('undefined' !== typeof data ? (' ' + JSON.stringify(data)) : '') + '\n');
}

Socket.prototype.cleanupCommandArgs = function (cmdrun, args) {
    var cmdargs = cmdrun.args || {};
    var args = args || {};

    for (var arg in cmdargs) {
        if (!(arg in args)) {
            if (cmdargs[arg].required) {
                throw new SyntaxError('Argument "' + arg + '" is expected.');
            } else {
                args[arg] = 'defaultValue' in cmdargs[arg] ? cmdargs[arg].defaultValue : null;
            }
        }

        if (('type' in cmdargs[arg]) && (cmdargs[arg].required && (cmdargs[arg].type != typeof args[arg]))) {
            throw new SyntaxError('Argument "' + arg + '" should be of type ' + cmdargs[arg].type + ' (' + typeof args[arg] + ' provided)');
        }
    }

    for (var arg in args) {
        if (!(arg in cmdargs)) {
            throw new SyntaxError('Argument "' + arg + '" is not expected.');
        }
    }

    if ('validate' in cmdrun) {
        args = cmdrun.validate(args);
    }

    return args;
}

Socket.prototype.recvCommand = function (msgid, command, args) {
    var that = this;
    var commands = this.commands[this.hasSession() ? 'session' : 'socket'];

    if (!(command in commands)) {
        throw new Error('The command "' + command + '" is not available.');
    }

    var cmdrun = commands[command];
    args = this.cleanupCommandArgs(cmdrun, args);

    var session = this.getSession();

    if (session) {
        function respond(error, result) {
            that.getSession().sendResult(msgid, error, result);
        }
    } else {
        function respond(error, result) {
            that.sendResult(msgid, error, result);
        }
    }

    try {
        cmdrun.handle.call(
            this,
            this.context,
            this.getSession(),
            args,
            respond
        );
    } catch (error) {
        this.logger.error(
            this.loggerTopic + '/command#' + command,
            error.code + ': ' + error.message
        );
        this.logger.info(
            this.loggerTopic + '/command#' + command,
            error.stack
        );

        this.sendError(error);
    }
}

Socket.prototype.sendSocketCommand = function (command, args, callback) {
    var msgid = uuid.v4();

    this.localCommandCallbacks[msgid] = callback;

    this.sendCommand(msgid, command, args);
}

Socket.prototype.recvResult = function (msgid, result) {
    if (msgid in this.localCommandCallbacks) {
        var callback = this.localCommandCallbacks[msgid];
        delete this.localCommandCallbacks[msgid];

        callback(
            ('error' in result) ? result.error : null,
            ('result' in result) ? result.result : null
        );
    } else if (this.hasSession()) {
        this.session.recvResult(msgid, result);
    } else {
        throw new Error('Received a result for an unknown local request.');
    }
}

Socket.prototype.recvError = function (error) {
    this.logger.error(
        this.loggerTopic + '/error',
        error.name + ': ' + error.message
    );
};

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
