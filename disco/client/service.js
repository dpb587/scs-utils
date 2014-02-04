var net = require('net');
var uuid = require('node-uuid');
var Session = require('../session');
var Socket = require('../socket');
var commands = require('./commands');

function Service(options, logger) {
    var options = options || {};
    options.server = options.server || {};
    options.server.host = options.server.host || '127.0.0.1';
    options.server.port = options.server.port || '9640';
    options.join = options.join || {};
    options.join.timeout = 30000;
    options.environment = options.environment || 'default';
    options.service = options.service || 'default';
    options.role = options.role || 'default';

    this.options = options;
    this.logger = logger;

    this.activeLocal = false;
    this.activeRemote = false;

    this.socket = null;
    this.session = new Session('anonymous', commands, logger);

    this.reconnectBackoff = 0;

    this.provisionHandles = {};
    this.requirementHandles = {};

    this.deferredCommands = [];
}

Service.prototype.deferCommand = function (cmd, args, callback) {
    if (this.socket && 'anonymous' != this.session.id) {
        this.session.sendCommand(cmd, args, callback);
    } else {
        this.deferredCommands.push([ cmd, args, callback ]);
    }
}

Service.prototype.flushDeferredCommands = function () {
    var that = this;

    var deferred = this.deferredCommands;
    this.deferredCommands = [];

    deferred.forEach(
        function (args) {
            that.deferCommand(args[0], args[1], args[2]);
        }
    );
}

Service.prototype.addProvision = function (endpoint, address, options) {
    var that = this;

    var lid = uuid.v4();

    var options = options || {};
    options.environment = options.environment || this.options.environment;
    options.service = options.service || this.options.service;
    options.role = options.roles || this.options.role;

    that.provisionHandles[lid] = {
        activeLocal : true,
        activeRemote : false
    };

    this.deferCommand(
        'provision.add',
        {
            environment : options.environment,
            service : options.service,
            role : options.role,
            endpoint : endpoint,
            address : address,
            attributes : options.attributes || null
        },
        function (error, result) {
            if (null !== error) {
                that.logger.error('provision', error);

                return;
            }

            that.provisionHandles[lid].handle = result.id;
            that.provisionHandles[lid].activeRemote = true;
        }
    );

    return lid;
}

Service.prototype.addRequirement = function (endpoint, options, callback) {
    if ('function' == typeof options) {
        callback = options;
        options = {};
    }

    var that = this;

    var lid = uuid.v4();

    var options = options || {};
    options.environment = options.environment || this.options.environment;
    options.service = options.service || this.options.service;
    options.role = options.roles || this.options.role;

    that.requirementHandles[lid] = {
        callback : callback,
        endpoints : null,
        activeLocal : true,
        activeRemote : false
    };

    this.deferCommand(
        'requirement.add',
        {
            environment : options.environment,
            service : options.service,
            role : options.role,
            endpoint : endpoint,
            attributes : options.attributes || null
        },
        function (error, result) {
            if (null !== error) {
                that.logger.error('requirement', error)

                return;
            }

            that.requirementHandles[lid].endpoints = result.endpoints;
            that.requirementHandles[lid].handle = result.id;
            that.requirementHandles[lid].activeRemote = true;
            that.requirementHandles[lid].callback('reset', result.endpoints);
        }
    );
}

Service.prototype.reconnect = function () {
    var that = this;

    if (this.socket) {
        this.socket.end();
    }

    this.session.unbindSocket();
    this.socket = null;

    this.socket = new Socket(
        this,
        new net.createConnection({
            host : this.options.server.host,
            port : this.options.server.port
        }),
        null,
        this.logger
    );

    this.socket.bindSession(this.session);

    this.socket.raw.on('connect', function () {
        that.logger.verbose('client', 'connected');

        that.reconnectBackoff = 0;

        if ('anonymous' != that.session.id) {
            that.session.sendCommand(
                'session.attach',
                { 'id' : that.session.id },
                function (error, result) {
                    if (error) {
                        that.logger.error('client/session.attach', error);

                        return;
                    }

                    that.logger.verbose('client', 'rejoined existing session');

                    that.flushDeferredCommands();
                }
            );
        } else {
            that.session.sendCommand(
                'session.join',
                {},
                function (error, result) {
                    if (error) {
                        that.logger.error('client/session.join', error);

                        return;
                    }

                    that.session.id = result.id;

                    that.logger.verbose('client', 'joined new session (' + that.session.id + ')');

                    that.flushDeferredCommands();
                }
            );
        }
    });
    this.socket.raw.on('error', function (error) {
        that.logger.error('client', error.message);
    });
    this.socket.raw.on('close', function (had_error) {
        if (that.activeLocal) {
            that.logger.silly('client', 'reconnecting in ' + that.reconnectBackoff + ' seconds...');

            setTimeout(
                function () {
                    that.reconnectBackoff += 10;
                    that.reconnect();
                },
                that.reconnectBackoff * 1000
            );
        }
    });

    this.logger.silly('client', 'connecting...');
};

Service.prototype.start = function (callback) {
    this.activeLocal = true;

    this.reconnect();
};

Service.prototype.stop = function (callback) {
    if (callback) this.server.on('close', callback);

    this.activeLocal = false;

    this.logger.silly('client', 'disconnecting...');

    this.socket.end();
}

module.exports = Service;
