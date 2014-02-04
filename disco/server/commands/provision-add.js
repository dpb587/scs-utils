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
    handle : function (session, args, respond) {
        var registry = session.socket.service.registry;

        if (!registry.hasSession(session)) {
            throw new Error('Session has not joined registry.');
        }

        var pid = registry.addProvisionHandle(session, args);

        respond(null, { id : pid });
    }
};
