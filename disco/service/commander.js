var serviceCommands = require('./commands');

function Commander(registry) {
    this.registry = registry;
}

Commander.prototype.getCommands = function (transportCommands) {
    var commands = {
        ephemeral : serviceCommands.ephemeral || {},
        session : serviceCommands.session || {}
    };

    if (ephemeral in transportCommands) {
        Object.keys(transportCommands.ephemeral).forEach(
            function (key) {
                commands.ephemeral[key] = transportCommands.ephemeral[key];
            }
        );
    }

    if (session in transportCommands) {
        Object.keys(transportCommands.session).forEach(
            function (key) {
                commands.session[key] = transportCommands.session[key];
            }
        );
    }

    return commands;
};

module.exports = Commander;
