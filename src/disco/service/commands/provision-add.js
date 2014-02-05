module.exports = {
    title : 'Add a provisioned endpoint to the registry.',
    args : {
        environment : {
            type : 'string',
            title : 'Environment Name'
        },
        service : {
            type : 'string',
            title : 'Service Name'
        },
        role : {
            type : 'string',
            title : 'Role Name'
        },
        endpoint : {
            type : 'string',
            title : 'Endpoint Name'
        },
        address : {
            type : 'object',
            title : 'Endpoint Address',
            description : [
                ' * host (string) - IP or hostname',
                ' * port (integer) - port number'
            ].join('\n')
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
                role : "wordpress",
                endpoint : "http",
                address : {
                    host : "192.0.2.39",
                    port : 30241
                },
                attributes : {
                    deploy : "2a964d9ab680",
                    zone : "us-west-2c"
                }
            }
        }
    ],
    handle : function (context, session, args, respond) {
        var pid = context.addProvision(session, args);

        respond(
            null,
            {
                id : pid
            }
        );
    }
};
