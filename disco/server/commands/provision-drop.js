module.exports = {
    about : 'Drop a provisioned endpoint from the registry.',
    example : '6dca1994-bfb4-4870-936c-917bcf2eddfb',
    args : {
        handle : {
            type : 'string',
            title : 'Provision Handle'
        },
        wait : {
            type : 'integer',
            title : 'Wait Timeout (seconds)',
            required : false
        }
    },
    handle : function (session, args, respond) {
        var registry = session.socket.service.registry;

        if (!registry.hasSession(session)) {
            throw new Error('Session has not joined registry.');
        }

        var responded = false;
        var responseTimeout = null;

        var phandle = registry.getProvisionByHandle(args.handle);
        phandle.activeClient = false;

        registry.dropProvisionHandle(
            args.handle,
            function () {
                handle.activeServer = false;

                if (!responded) {
                    clearTimeout(responseTimeout);

                    respond(null, { success : true, timed_out : false });
                }
            }
        );

        if (null === args.wait) {
            responded = true;
            respond(null, { success : true });
        } else if (0 < args.wait) {
            responseTimeout = setTimeout(
                function () {
                    responded = true;
                    respond(null, { success : true, timed_out : true });
                },
                1000 * args.wait
            );
        }
    }
};
