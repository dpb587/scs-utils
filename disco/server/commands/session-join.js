module.exports = {
    about : 'Join the registry.',
    args : {
        options : {
            type : 'object',
            title : 'Client Options',
            required : false,
            description : [
                'Available options are:',
                ' * attributes (object) - attributes propagated to all provided services',
                ' * name (string) - a friendly name for the client',
                ' * timeout (integer) - enable reconnect timeouts in case of disconnect'
            ].join('\n')
        }
    },
    handle : function (session, args, respond) {
        session.socket.service.registry.sessionJoin(session);
        session.setOptions(args.options);

        respond(null, { session : session.id });
    }
};
