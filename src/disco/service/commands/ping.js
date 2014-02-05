module.exports = {
    about : 'Ping the server to retrieve some debug information.',
    args : {
        reply : {
            type : 'string',
            required : false,
            title : 'A message the server should respond with.'
        }
    },
    handle : function (context, session, args, respond) {
        respond(
            null,
            {
                message : args.reply,
                session : session ? session.id : false,
                remote : this.remoteAddress + ':' + this.remotePort
            }
        );
    }
};
