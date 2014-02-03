module.exports = {
    about : 'Detach from the active session',
    handle : function (socket, payload, respond) {
        if (!socket.session) {
            throw new Error('Socket is not bound to a session.');
        }

        socket.session.unbindSocket();

        respond(null, true);
    }
};
