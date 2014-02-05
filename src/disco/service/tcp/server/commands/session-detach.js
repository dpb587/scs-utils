module.exports = {
    about : 'Detach from the active session',
    handle : function (context, session, args, respond) {
        session.detach(this);

        respond(null, { status : 'success' });
    }
};
