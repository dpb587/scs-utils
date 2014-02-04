module.exports = {
    about : 'Reattach to an existing session.',
    args : {
        id : {
            type : 'string',
            title : 'Client Identifier',
            required : false,
            description : 'The previously supplied client identifier when reconnecting a disconnected socket.'
        }
    },
    handle : function (session, args, respond) {
        if (session.socket.service.registry.hasSession(session.id)) {
            throw new Error('Session is already registered.');
        }

        session.socket.service.registry.sessionRejoin(args.id);

        respond(null, true);
    }
};
