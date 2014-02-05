module.exports = {
    about : 'Leave the registry.',
    handle : function (context, session, args, respond) {
        session.detach(this);
        context.destroySession(session);

        this.setSession(null);

        respond(
            null,
            {
                timed_out : false
            }
        );
    }
};
