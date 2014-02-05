module.exports = {
    about : 'Ping the server to retrieve some debug information.',
    args : {
        reply : {
            type : 'string',
            required : false,
            title : 'A message the server should respond with.'
        },
        delay : {
            type : 'number',
            required : false,
            title : 'Delay the reply by seconds.'
        }
    },
    handle : function (context, session, args, respond) {
        function send() {
            respond(
                null,
                {
                    message : args.reply,
                    session : session ? session.id : false,
                    remote : this.remoteAddress + ':' + this.remotePort
                }
            );
        }

        setTimeout(send.bind(this), args.delay || 0);
    }
};
