module.exports = {
    socket : {
        'ping' : require('./ping')
    },
    session : {
        'provision.add' : require('./provision-add'),
        'provision.drop' : require('./provision-drop'),
        'requirement.add' : require('./requirement-add'),
        'requirement.drop' : require('./requirement-drop'),
        'ping' : require('./ping')
    }
};
