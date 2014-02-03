module.exports = {
    about : 'Add a provisioned endpoint to the registry.',
    example : 'prod blog mysql-master mysql 192.0.2.39 30241 {"attributes":{"deploy":"2a964d9ab680","zone":"us-west-2c"}}',
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
        dhost : {
            type : 'string',
            title : 'Endpoint Host'
        },
        dport : {
            type : 'integer',
            title : 'Endpoint Port'
        },
        options : {
            type : 'object',
            required : false,
            title : 'Service Options',
            description : [
                'Available options are:',
                ' * attributes (object) - simple key/value pairs about the service'
            ].join('\n')
        }
    },
    handle : function (session, args, respond) {
        var registry = session.socket.service.registry;

        if (!registry.hasSession(session)) {
            throw new Error('Session has not joined registry.');
        }

        var pid = registry.addProvisionHandle(session, args);

        respond(null, { handle : pid });
    }
};
