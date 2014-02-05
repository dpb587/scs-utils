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
            socket.session.recvResult(msgid, data);
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

        if (!(cmd in commands)) {
            throw new Error('The command "' + cmd + '" is not available.');
        }

        var cmdrun = commands[cmd];
        args = service.cleanupCommandArgs(cmdrun, args);

        try {
            cmdrun.handle.call(this, service.registry, socket.getSession(), args, respond);
        } catch (error) {
            socket.logger.error(
                socket.loggerTopic + '/command#' + cmd,
                error.code + ': ' + error.message
            );
            socket.logger.info(
                socket.loggerTopic + '/command#' + cmd,
                error.stack
            );

            respond(error);
        }
    });

    var wrapped = new Socket(service, socket, null, service.logger);

    wrapped.bindSession(new Session(uuid.v4(), Commands, service.logger));

    service.sockets[wrapped.id] = wrapped;
}

function Service(registry, commander, options, logger) {
    options = options || {};

    options.heartbeat = options.heartbeat || 15000;

    options.listen = options.listen || {};
    options.listen.host = options.listen.host || '127.0.0.1';
    options.listen.port = options.listen.port || '9640';

    this.registry = registry;
    this.commander = commander;
    this.options = options;

    this.logger = logger;
    this.loggerTopic = 'server/tcp#' + this.options.listen.host + ':' + this.options.listen.port;

    this.server = null;

    this.sockets = {};

    this.commands = this.commander.getCommands(Commands);
}

Service.prototype.cleanupCommandArgs = function (cmdrun, args) {
    if ('args' in cmdrun) {
        for (var arg in cmdrun.args) {
            if (!(arg in args)) {
                if (cmdrun.args[arg].required) {
                    throw new SyntaxError('Argument "' + arg + '" is expected.');
                } else {
                    args[arg] = null;
                }
            }
        }

        for (var arg in args) {
            if (!(arg in cmdrun.args)) {
                throw new SyntaxError('Argument "' + arg + '" is not expected.');
            }
        }

        if ('validate' in cmdrun) {
            args = cmdrun.validate(args);
        }
    } else if (0 < Object.keys(args).length) {
        throw new SyntaxError('Arguments are not expected.');
    }

    return args;
}

Service.prototype.start = function (callback) {
    var that = this;

    if (this.server) {
        callback();
    }

    this.server = new net.createServer();
    this.server.on('listening', function () {
        that.logger.info(
            that.loggerTopic,
            'started'
        );
    });
    this.server.on('connection', function (socket) {
        var address = socket.address();

        that.logger.verbose(
            that.loggerTopic,
            'connection from ' + socket.remoteAddress + ':' + socket.remotePort
        );

        attachSocket(that, socket);
    });
    this.server.on('close', function () {
        that.logger.verbose(
            that.loggerTopic,
            'stopped'
        );
    });
    this.server.on('error', function (error) {
        that.logger.error(
            that.loggerTopic,
            error.message
        );
        that.logger.info(
            that.loggerTopic,
            error.stack
        );

        throw error;
    });

    if (callback) this.server.on('listening', callback);

    this.logger.silly(
        this.loggerTopic,
        'starting...'
    );

    this.server.listen(this.options.listen.port, this.options.listen.host);
};

Service.prototype.stop = function (callback) {
    if (callback) this.server.on('close', callback);

    this.logger.silly(
        this.loggerTopic,
        'stopping...'
    );

    this.server.close();
}

module.exports = Service;
