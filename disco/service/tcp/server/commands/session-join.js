module.exports = {
    about : 'Join the registry.',
    args : {
        options : {
            type : 'object',
            title : 'Client Options',
            required : false,
            description : [
                'Available options are:',
                ' * attributes (object) - reference attributes about the client',
                ' * timeout (integer) - enable reconnect timeouts in case of disconnect'
            ].join('\n')
        }
    },
    handle : function (context, session, args, respond) {
        session = context.createSession(this, args.options);

        respond(null, { id : session.id });
    }
};
