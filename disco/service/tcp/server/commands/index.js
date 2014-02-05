module.exports = {
    ephemeral : {
        'session.join' : require('./session-join'),
        'session.attach' : require('./session-attach')
    },
    session : {
        'session.leave' : require('./session-leave'),
        'session.detach' : require('./session-detach')
    }
};
