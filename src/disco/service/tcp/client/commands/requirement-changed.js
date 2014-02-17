module.exports = {
    about : 'Client is notified about a changing requirement.',
    args : {
        id : {
            type : 'string',
            title : 'Requirement handle which is changing'
        },
        action : {
            type : 'string',
            title : 'Change action',
            description : [
                'May be one of the following:',
                ' * add - a new provision has been added',
                ' * drop - an existing provision has been or is being dropped'
            ].join('\n')
        },
        endpoints : {
            type : 'object',
            title : 'Provisioning details'
        }
    },
    handle : function (context, session, args, respond) {
        var client = session.socket.service;
        var responded = false;

        Object.keys(client.requirementHandles).some(
            function (lid) {
                var rdat = client.requirementHandles[lid];

                if (args.id != rdat.handle) {
                    return false;
                }

                if (!args.id in rdat.endpoints) {
                    session.logger.verbose(
                        'command/requirement.changed',
                        'endpoint was not found locally'
                    );

                    return true;
                }

                delete rdat.endpoints[args.id];

                rdat.callback(
                    args.action,
                    args.endpoints,
                    function () {
                        respond(null, { ack : true });
                    }
                );

                return true;
            }
        );
    }
};
