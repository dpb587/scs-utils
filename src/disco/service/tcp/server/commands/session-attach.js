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
    handle : function (context, session, args, respond) {
        context.getSession(args.id).attach(this);

        respond(null, { status : 'success' });
    }
};
