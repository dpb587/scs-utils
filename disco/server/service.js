var net = require('net');
var uuid = require('node-uuid');
var Commands = require('./commands');
var Session = require('../session');
var Socket = require('../socket');

function attachSocket(service, socket) {
    var wrapped = new Socket(service, socket, null, service.logger);

    wrapped.bindSession(new Session(uuid.v4(), Commands, service.logger));

    service.sockets[wrapped.id] = wrapped;
}

function Service(registry, options, logger) {
    options = options || {};
    options.heartbeat = options.heartbeat || 15000;
    options.listen = options.listen || {};
    options.listen.host = options.listen.host || '127.0.0.1';
    options.listen.port = options.listen.port || '9640';

    this.registry = registry;
    this.options = options;
    this.logger = logger;
    this.server = null;
    this.sockets = {};
}

Service.prototype.start = function (callback) {
    var that = this;

    if (this.server) {
        callback();
    }

    this.server = new net.createServer();
    this.server.on('listening', function () {
        that.logger.info('registry/server', 'ready for connections');
    });
    this.server.on('connection', function (socket) {
        var address = socket.address();

        that.logger.verbose('registry/server/socket#' + socket.remoteAddress + ':' + socket.remotePort, 'connection opened');

        attachSocket(that, socket);
    });
    this.server.on('close', function () {
        that.logger.verbose('registry/server', 'stopped listening');
    });
    this.server.on('error', function (error) {
        that.logger.error('registry/server', error.message);

        throw error;
    });

    if (callback) this.server.on('listening', callback);

    this.logger.silly('registry/server', 'starting...');

    this.server.listen(this.options.listen.port, this.options.listen.host);
};

Service.prototype.stop = function (callback) {
    if (callback) this.server.on('close', callback);

    this.logger.silly('registry/server', 'stopping...');

    this.server.close();
}

module.exports = Service;
