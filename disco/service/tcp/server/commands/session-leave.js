module.exports = {
    about : 'Leave the registry.',
    handle : function (context, session, args, respond) {
        context.destroySession(session);

        respond(null, true);
    }
};
