var net = require('net');
var uuid = require('node-uuid');
var Socket = require('../socket');
var UtilCommands = require('../../common/util-commands');

function Service(registry, options, logger) {
    options = options || {};

    options.heartbeat = options.heartbeat || 15000;

    options.listen = options.listen || {};
    options.listen.host = 'host' in options.listen ? options.listen.host : '127.0.0.1';
    options.listen.port = 'port' in options.listen ? options.listen.port : '9640';

    this.registry = registry;
    this.options = options;

    this.logger = logger;
    this.loggerTopic = 'server/tcp#' + this.options.listen.host + ':' + this.options.listen.port;

    this.raw = null;

    this.sockets = {};

    this.socketCommands = UtilCommands.mergeCommandSets(
        [
            require('../../common/server/commands'),
            require('./commands')
        ]
    );
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
    this.raw.on('connection', function (raw) {
        that.logger.verbose(
            that.loggerTopic,
            'connection from ' + raw.remoteAddress + ':' + raw.remotePort
        );

        var socket = new Socket(that, raw, that.registry, {}, that.logger);

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
