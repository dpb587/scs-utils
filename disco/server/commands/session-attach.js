module.exports = {
    about : 'Reattach to an existing session.',
    args : {
        uuid : {
            type : 'string',
            title : 'Client Identifier',
            required : false,
            description : 'The previously supplied client identifier when reconnecting a disconnected socket.'
        }
    },
    handle : function (socket, payload, respond) {
        if (socket.session) {
            throw new Error('Socket is already bound to a session.');
        }

        socket.bindSession(session);

        respond(null, true);
    }
};
