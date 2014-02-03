module.exports = {
    about : 'Drop a required endpoint from the registry.',
    example : '2c1c3d30-9d62-4091-bdd7-ed15aa3021df',
    args : {
        handle : {
            type : 'string',
            title : 'Requirement Handle'
        }
    },
    handle : function (socket, payload, respond) {
        if (!socket.session) {
            throw new Error('Socket is not bound to a session.');
        }

        var handle = socket.session.getRequirementByHandle(payload.handle);
        handle.activeClient = false;

        socket.registry.unregisterRequirement(
            socket.session,
            payload.handle,
            function () {
                handle.activeServer = false;

                socket.session.dropRequirementHandle(payload.handle);

                respond(null, true);
            }
        );
    }
};
