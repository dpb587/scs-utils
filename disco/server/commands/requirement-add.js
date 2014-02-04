module.exports = {
    about : 'Add a required endpoint to the registry.',
    example : 'prod blog mysql-master mysql {"attributes":{"zone":"us-west-2c"}}',
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
    handle : function (session, args, respond) {
        var registry = session.socket.service.registry;

        if (!registry.hasSession(session)) {
            throw new Error('Session has not joined registry.');
        }

        var rid = registry.addRequirementHandle(session, args);
        var endpoints = registry.discoverRequirements(rid);

        respond(null, { id : rid, endpoints : endpoints });
    }
};
