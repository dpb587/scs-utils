var uuid = require('node-uuid');

function Session(registry, options, logger) {
    this.id = uuid.v4();

    options = options || {};
    this.options = options;

    this.registry = registry;

    this.logger = logger;
    this.loggerTopic = 'session#' + this.id;

    this.socket = null;
    this.socketQueue = [];

    this.commandCallbacks = {};
}

Session.prototype.attach = function (socket) {
    if (this.isAttached()) {
        this.detach();
    }

    this.socket = socket;

    this.logger.silly(
        this.loggerTopic + '/socket',
        'bound to ' + socket.id
    );
};

Session.prototype.detach = function () {
    this.socket = null;

    this.logger.silly(
        this.loggerTopic + '/socket',
        'unbound'
    );
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
