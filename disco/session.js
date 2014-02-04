var uuid = require('node-uuid');

function Session(id, commands, logger) {
    this.id = id;
    this.commands = commands;
    this.options = {};
    this.logger = logger;

    this.socket = null;
    this.queuedWrites = [];
    this.commandCallbacks = {};
}

Session.prototype.setOptions = function (options) {
    this.options = options;
}

Session.prototype.bindSocket = function (socket) {
    this.socket = socket;

    this.logger.silly('session#' + this.id + '/socket', 'bound to ' + socket.id);
};

Session.prototype.unbindSocket = function () {
    if (null === this.socket) {
        return;
    }

    this.socket = null;

    this.logger.silly('session#' + this.id + '/socket', 'unbound');
};

Session.prototype.write = function (data) {
    if (this.socket) {
        this.socket.write(data);
    } else {
        this.queuedWrites.push(data);

        this.logger.silly('session#' + this.id + '/queued' + data);
    }
};

Session.prototype.sendCommand = function (cmd, data, cbref) {
    var id = uuid.v4();

    this.commandCallbacks[id] = cbref;

    this.write('c:' + id + ' ' + cmd + ' ' + JSON.stringify(data) + '\n');
};

Session.prototype.sendResult = function (id, err, res) {
    if (err) {
        this.write('r:' + id + ' ' + JSON.stringify({ error : err }) + '\n');
    } else {
        this.write('r:' + id + ' ' + JSON.stringify({ result : result }) + '\n');
    }
};

Session.prototype.recvCommand = function (id, cmd, data) {
    if (!(cmd in this.commands)) {
        throw new Error('Unrecognized command (' + cmd + ')');
    }

    var that = this;
    var command = this.commands[cmd];
    var payload = null;

    function respond(err, result) {
        if (err) {
            that.write('r:' + id + ' ' + JSON.stringify({ 'error' : err.message }) + '\n');

            return;
        }

        that.write('r:' + id + ' ' + JSON.stringify({ 'result' : result }) + '\n');
    }

    try {
        if ('args' in command) {
            for (var arg in command.args) {
                if (!(arg in data)) {
                    if (command.args[arg].required) {
                        throw new Error('Arguments: missing "' + arg + '"');
                    } else {
                        data[arg] = null;
                    }
                }
            }

            for (var arg in data) {
                if (!(arg in command.args)) {
                    throw new Error('Arguments: unexpected "' + arg + '"');
                }
            }

            if ('validate' in command) {
                data = command.validate(data);
            }
        } else if (0 < Object.keys(data).length) {
            throw new Error('Arguments: no arguments are supported');
        }

        command.handle(this, data, respond);
    } catch (e) {
        respond(e);
        this.logger.error(e.stack);
    }
};

Session.prototype.recvResult = function (id, result) {
    if (!(id in this.commandCallbacks)) {
        throw new Error('Command identifier not known (' + id + ')');
    }

    var cbref = this.commandCallbacks[id];
    delete this.commandCallbacks[id];

    cbref(('error' in result) ? result.error : null, ('result' in result) ? result.result : null);
};

module.exports = Session;
