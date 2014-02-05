module.exports = {};

module.exports.mergeCommandSets = function (sets) {
    var commands = {
        ephemeral : {},
        session : {}
    };

    sets.forEach(
        function (set) {
            if ('ephemeral' in set) {
                Object.keys(set.ephemeral).forEach(
                    function (key) {
                        commands.ephemeral[key] = set.ephemeral[key];
                    }
                );
            }

            if ('session' in set) {
                Object.keys(set.session).forEach(
                    function (key) {
                        commands.session[key] = set.session[key];
                    }
                );
            }
        }
    );

    return commands;
};
