module.exports = {
    about : 'Leave the registry.',
    handle : function (socket, payload, respond) {
        if (!socket.session) {
            throw new Error('Socket is not bound to a session.');
        }

        socket.session.terminate();

        respond(null, true);
    }
};
