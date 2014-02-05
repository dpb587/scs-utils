module.exports = {
    about : 'Drop a requirement handle from the registry.',
    args : {
        id : {
            type : 'string',
            title : 'Requirement ID'
        }
    },
    examples : [
        {
            args : {
                id : "2c1c3d30-9d62-4091-bdd7-ed15aa3021df"
            }
        }
    ],
    handle : function (context, session, args, respond) {
        var handle = context.getRequirement(args.id);
        handle.activeClient = false;

        context.dropRequirement(args.id);

        respond(
            null,
            {
                ack : true
            }
        );
    }
};
