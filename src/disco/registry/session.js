var uuid = require('node-uuid');

function Session(registry, options, logger) {
    this.id = uuid.v4();

    options = options || {};
    options.attributes = options.attributes || {};
    options.timeout = options.timeout || 0;

    this.options = options;

    this.registry = registry;

    this.logger = logger;
    this.loggerTopic = 'session#' + this.id;

    this.socket = null;
    this.socketQueue = [];

    this.commandCallbacks = {};

    this.detachTimeout = false;

    this.activeLocal = true;
    this.activeRemote = false;
}

Session.prototype.startDetachTimeout = function () {
    var that = this;

    this.detachTimeout = setTimeout(
        function () {
            that.logger.verbose(
                that.loggerTopic + '/timeout',
                'destroying session'
            );

            that.registry.destroySession(
                that.id,
                function () {
                    that.logger.info(
                        that.loggerTopic + '/detach-timeout',
                        'destroyed session'
                    );
                }
            )
        },
        this.options.timeout
    );
}

Session.prototype.stopDetachTimeout = function () {
    clearTimeout(this.detachTimeout);
}

Session.prototype.attach = function (socket) {
    if (!this.activeLocal) {
        throw new Error('Session is no longer active.');
    }

    if (this.isAttached()) {
        this.detach();
    }

    this.stopDetachTimeout();

    this.socket = socket;

    this.logger.silly(
        this.loggerTopic + '/socket',
        'bound to ' + socket.id
    );

    process.nextTick(
        this.flushQueue.bind(this)
    );
};

Session.prototype.detach = function () {
    this.socket = null;

    this.logger.silly(
        this.loggerTopic + '/socket',
        'unbound'
    );

    this.startDetachTimeout();
};

Session.prototype.isAttached = function () {
    return null !== this.socket;
}

Session.prototype.pushSocket = function (method, args) {
    if (this.isAttached()) {
        this.socket[method].apply(this.socket, args);
    } else {
        this.socketQueue.push([ method, args ]);

        this.logger.silly(
            this.loggerTopic + '/queued',
            method + ' ' + JSON.stringify(args)
        );
    }
};

Session.prototype.flushQueue = function () {
    var that = this;
    var queue = this.socketQueue.slice(0, this.socketQueue.length);
    this.socketQueue = [];

    queue.forEach(
        function (call) {
            that.socket[call[0]].apply(that.socket, call[1]);
        }
    );
}

Session.prototype.sendCommand = function (command, data, callback) {
    var msgid = uuid.v4();

    this.commandCallbacks[msgid] = callback;

    this.pushSocket('sendCommand', [ msgid, command, data ]);
};

Session.prototype.recvResult = function (msgid, result) {
    if (!(msgid in this.commandCallbacks)) {
        this.logger.error(
            this.loggerTopic + '/result',
            'Received a result for an unknown request.'
        );

        throw new Error('Message identifier is not recognized (' + msgid + ')');
    }

    var callback = this.commandCallbacks[msgid];
    delete this.commandCallbacks[msgid];

    callback(
        ('error' in result) ? result.error : null,
        ('result' in result) ? result.result : null
    );
};

module.exports = Session;
