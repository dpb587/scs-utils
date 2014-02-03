module.exports = {
    about : 'Ping the server to retrieve some debug information.',
    args : {
        message : {
            type : 'string',
            required : false
        }
    },
    handle : function (socket, payload, respond) {
        respond(
            null,
            {
                message : payload,
                session : socket.session ? socket.session.uuid : null,
                remote : socket.remoteIdent
            }
        );
    }
};
