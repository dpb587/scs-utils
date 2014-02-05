module.exports = {
    about : 'Drop a provisioned endpoint from the registry.',
    args : {
        id : {
            type : 'string',
            title : 'Provision ID'
        },
        wait : {
            type : 'integer',
            title : 'Wait Timeout (seconds)',
            required : false
        }
    },
    examples : [
        {
            args : {
                id : "6dca1994-bfb4-4870-936c-917bcf2eddfb"
            }
        }
    ],
    handle : function (context, session, args, respond) {
        var responded = false;
        var responseTimeout = null;

        var phandle = context.getProvision(args.id);
        phandle.activeClient = false;

        context.dropProvisionHandle(
            args.id,
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
