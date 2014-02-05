module.exports = {
    about : 'Add a required endpoint to the registry.',
    args : {
        environment : {
            type : 'string',
            title : 'Environment Name'
        },
        service : {
            type : 'string',
            title : 'Role Name'
        },
        role : {
            type : 'string',
            title : 'Role Name'
        },
        endpoint : {
            type : 'string',
            title : 'Endpoint Name'
        },
        attributes : {
            type : 'object',
            title : 'Arbitrary attributes for filtering',
            required : false
        }
    },
    examples : [
        {
            args : {
                environment : "prod",
                service : "public-blog",
                role : "mysql-master",
                endpoint : "mysql"
            }
        }
    ],
    handle : function (context, session, args, respond) {
        var rid = context.addRequirement(session, args);
        var endpoints = context.discoverRequirements(rid);

        respond(
            null,
            {
                id : rid,
                endpoints : endpoints
            }
        );
    }
};
