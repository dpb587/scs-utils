module.exports = {};

module.exports.mergeCommandSets = function (sets) {
    var commands = {
        socket : {},
        session : {}
    };

    sets.forEach(
        function (set) {
            if ('socket' in set) {
                Object.keys(set.socket).forEach(
                    function (key) {
                        commands.socket[key] = set.socket[key];
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
