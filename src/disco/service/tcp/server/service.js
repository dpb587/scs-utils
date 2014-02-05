var net = require('net');
var uuid = require('node-uuid');
var Commands = require('./commands');
var Socket = require('./socket');

function createSocket(service, raw) {
    var socket = new Socket(service, raw, {}, service.logger);
    var ephemeralCallbacks = {};

    socket.on('result', function (msgid, result) {
        if (msgid in ephemeralCallbacks) {
            ephemeralCallbacks[msgid](data);
            delete ephemeralCallbacks[msgid];
        } else if (socket.hasSession()) {
            socket.session.recvResult(msgid, result);
        } else {
            throw new Error('Received a result for an unknown request.');
        }
    });
    socket.on('error', function (error) {
        this.logger.error(
            this.loggerTopic + '/error',
            error.name + ': ' + error.message
        );
    });
    socket.on('command', function (msgid, command, args) {
        var commands = service.commands[socket.hasSession() ? 'session' : 'ephemeral'];

        if (!(command in commands)) {
            throw new Error('The command "' + command + '" is not available.');
        }

        var cmdrun = commands[command];
        args = service.cleanupCommandArgs(cmdrun, args);

        var session = socket.getSession();

        if (session) {
            function respond(error, result) {
                socket.getSession().sendResult(msgid, error, result);
            }
        } else {
            function respond(error, result) {
                socket.sendResult(msgid, error, result);
            }
        }

        try {
            cmdrun.handle.call(
                this,
                service.registry,
                socket.getSession(),
                args,
                respond
            );
        } catch (error) {
            socket.logger.error(
                socket.loggerTopic + '/command#' + command,
                error.code + ': ' + error.message
            );
            socket.logger.info(
                socket.loggerTopic + '/command#' + command,
                error.stack
            );

            socket.sendError(error);
        }
    });

    return socket;
}

function Service(registry, commander, options, logger) {
    options = options || {};

    options.heartbeat = options.heartbeat || 15000;

    options.listen = options.listen || {};
    options.listen.host = 'host' in options.listen ? options.listen.host : '127.0.0.1';
    options.listen.port = 'port' in options.listen ? options.listen.port : '9640';

    this.registry = registry;
    this.commander = commander;
    this.options = options;

    this.logger = logger;
    this.loggerTopic = 'server/tcp#' + this.options.listen.host + ':' + this.options.listen.port;

    this.raw = null;

    this.sockets = {};

    this.commands = this.commander.getCommands(Commands);
}

Service.prototype.cleanupCommandArgs = function (cmdrun, args) {
    var cmdargs = cmdrun.args || {};

    for (var arg in cmdargs) {
        if (!(arg in args)) {
            if (cmdargs[arg].required) {
                throw new SyntaxError('Argument "' + arg + '" is expected.');
            } else {
                args[arg] = null;
            }
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

Service.prototype.start = function (callback) {
    var that = this;

    if (this.raw) {
        callback();

        return;
    }

    var listening = false;

    this.raw = new net.createServer();
    this.raw.on('listening', function () {
        listening = true;

        that.logger.info(
            that.loggerTopic,
            'started'
        );
    });
    this.raw.on('connection', function (socket) {
        var address = socket.address();

        that.logger.verbose(
            that.loggerTopic,
            'connection from ' + socket.remoteAddress + ':' + socket.remotePort
        );

        var socket = createSocket(that, socket);

        that.sockets[socket.id] = socket;
    });
    this.raw.on('close', function () {
        that.logger.verbose(
            that.loggerTopic,
            'stopped'
        );
    });
    this.raw.on('error', function (error) {
        that.logger.error(
            that.loggerTopic,
            error.message
        );
        that.logger.info(
            that.loggerTopic,
            error.stack
        );

        if (!listening) {
            callback(error);
        }
    });

    if (callback) {
        this.raw.on('listening', callback);
    }

    this.logger.silly(
        this.loggerTopic,
        'starting...'
    );

    this.raw.listen(this.options.listen.port, this.options.listen.host);
};

Service.prototype.stop = function (callback) {
    if (callback) {
        this.raw.on('close', callback);
    }

    this.logger.silly(
        this.loggerTopic,
        'stopping...'
    );

    this.raw.close();
}

module.exports = Service;
