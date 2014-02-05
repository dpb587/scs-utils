module.exports = {
    ephemeral : {
        'registry.join' : require('./registry-join'),
        'session.attach' : require('./session-attach')
    },
    session : {
        'session.detach' : require('./session-detach'),
        'registry.leave' : require('./registry-leave')
    }
};
