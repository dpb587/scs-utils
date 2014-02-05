module.exports = {
    about : 'Leave the registry.',
    args : {
        wait : {
            type : 'number',
            title : 'Wait Timeout (seconds)',
            defaultValue : 0,
            required : false
        }
    },
    examples : [
        {
            args : {
                wait : 5
            }
        }
    ],
    handle : function (context, session, args, respond) {
        var responded = false;
        var responseTimeout = null;

        context.destroySession(
            session.id,
            function () {
                if (!responded) {
                    clearTimeout(responseTimeout);

                    respond(
                        null,
                        {
                            timed_out : false
                        }
                    );
                }
            }
        );

        if (null === args.wait) {
            responded = true;
            respond(
                null,
                {
                    ack : true
                }
            );
        } else if (0 < args.wait) {
            responseTimeout = setTimeout(
                function () {
                    responded = true;
                    respond(
                        null,
                        {
                            timed_out : true
                        }
                    );
                },
                1000 * args.wait
            );
        }
    }
};
