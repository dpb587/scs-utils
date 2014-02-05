var SocketBase = require('../socket');
var util = require('util');

function Socket() {
    SocketBase.apply(this, arguments);

    this.session = null;
}

util.inherits(Socket, SocketBase);

Socket.prototype.setSession = function (session) {
    this.session = session;
}

Socket.prototype.getSession = function () {
    return this.session;
}

Socket.prototype.hasSession = function () {
    return null !== this.session;
}

module.exports = Socket;
