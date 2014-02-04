var uuid = require('node-uuid');

function getLookupFromOptions(options) {
    return options.environment + '/' + options.service + '/' + options.role + '/' + options.endpoint;
}

function Registry(options, logger) {
    var options = options || {};

    this.options = options;
    this.logger = logger;

    this.sessions = {};
    this.provisionHandles = {};
    this.requirementHandles = {};
    this.discoveryMap = {};
}

Registry.prototype.sessionJoin = function (session) {
    this.sessions[session.id] = session;
};

Registry.prototype.hasSession = function (session) {
    return session.id in this.sessions;
};

Registry.prototype.sessionRejoin = function (id) {
    if (!(id in this.sessions)) {
        throw new Error('Session is not available.');
    }

    return this.sessions[id];
};

/**
 * provisions
 */

Registry.prototype.addProvisionHandle = function (session, options) {
    // create our handle
    var pid = uuid.v4();
    var phandle = {
        activeServer : true,
        activeClient : true,
        session : session.id,
        environment : options.environment,
        service : options.service,
        role : options.role,
        endpoint : options.endpoint,
        stat_created : new Date(),
        address : options.address,
        attributes : options.attributes || {},
        required_by : {}
    };

    this.provisionHandles[pid] = phandle;

    // add to discovery map
    var lookup = getLookupFromOptions(options);

    if (!(lookup in this.discoveryMap)) {
        this.discoveryMap[lookup] = {
            provided_by : {},
            watched_by : {}
        };
    }

    this.discoveryMap[lookup].provided_by[pid] = true;

    // log it
    this.logger.verbose(
        'provision/handle#' + pid,
        'added'
    );

    // see if anyone cares about this
    for (var rid in this.discoveryMap[lookup].watched_by) {
        if (!this.discoveryMap[lookup].watched_by[rid]) {
            // being terminated
            continue;
        }

        var rhandle = this.requirementHandles[rid];

        if (!this.doesRequirementWantProvision(rhandle, phandle)) {
            continue;
        }

        // update and notify
        phandle.required_by[rid] = true;

        this.sessions[rhandle.session].sendCommand(
            'requirement.changed',
            {
                id : rid,
                action : 'add',
                provision : {
                    id : pid,
                    address : phandle.address,
                    attributes : phandle.attributes
                }
            },
            function () {
                // okay
            }
        );
    }

    return pid;
};

Registry.prototype.getProvisionByHandle = function (pid) {
    if (!(pid in this.provisionHandles)) {
        throw new Error('Registry does not provide ' + pid);
    }

    return this.provisionHandles[pid]
}

Registry.prototype.dropProvisionHandle = function (pid, callback) {
    var that = this;

    if (!(pid in this.provisionHandles)) {
        throw new Error('Registry does not provide ' + pid);
    }

    var phandle = this.provisionHandles[pid];
    phandle.activeServer = false;

    var ackrem = 0;

    function readyCallback() {
        if (0 < ackrem) {
            return;
        }

        delete this.provisionHandles[pid];

        callback();
    }

    Object.keys(phandle.required_by).forEach(
        function (rid) {
            if (!phandle.required_by[rid]) {
                // already being terminated
                return;
            }

            phandle.required_by[rid] = false;

            var rhandle = that.requirementHandles[rid];

            that.sessions[rhandle.session].sendCommand(
                'requirement.changed',
                {
                    id : rid,
                    action : 'drop',
                    provision : {
                        id : pid,
                        address : phandle.address,
                        attributes : phandle.attributes
                    }
                },
                function () {
                    ackrem -= 1;

                    delete phandle.required_by[rid];

                    readyCallback();
                }
            );

            ackrem += 1;
        }
    );
}

/**
 * requirements
 */

Registry.prototype.addRequirementHandle = function (session, options) {
    var id = uuid.v4();

    var attributes_re = options.attributes || {};

    for (var key in attributes_re) {
        attributes_re[key] = new RegExp(attributes_re[key]);
    }

    this.requirementHandles[id] = {
        activeServer : true,
        activeClient : true,
        session : session.id,
        environment : options.environment,
        service : options.service,
        role : options.role,
        endpoint : options.endpoint,
        attributes : options.attributes || {},
        attributes_re : options.attributes_re
    };

    var lookup = getLookupFromOptions(options);

    if (!(lookup in this.discoveryMap)) {
        this.discoveryMap[lookup] = {
            provided_by : {},
            watched_by : {}
        };
    }

    this.discoveryMap[lookup].watched_by[id] = true;


    return id;
};

Registry.prototype.getRequirementByHandle = function (id) {
    if (!(id in this.requirementHandles)) {
        throw new Error('Registry does not require ' + id);
    }

    return this.requirementHandles[id]
}

Registry.prototype.dropRequirementHandle = function (id) {
    if (!(id in this.requirementHandles)) {
        throw new Error('Registry does not require ' + id);
    }

    var requirement = this.requirementHandles[id];

    if (requirement.activeServer || requirement.activeClient) {
        throw new Error('Requirement seems to be active: ' + [ requirement.activeServer ? 'server' : '', requirement.activeClient ? 'client' : '' ].join(','));
    }

    delete this.requirementHandles[id];
};

Registry.prototype.discoverRequirements = function (rid) {
    var that = this;
    var rhandle = this.getRequirementByHandle(rid);
    var lookup = getLookupFromOptions(rhandle);

    if (!(lookup in this.discoveryMap)) {
        that.logger.error('asdf');
        return {};
    }

    var endpointMap = this.discoveryMap[lookup];

    var matches = [];

    Object.keys(endpointMap.provided_by).forEach(
        function (pid) {
            var phandle = that.getProvisionByHandle(pid);

            if (!that.doesRequirementWantProvision(rhandle, phandle)) {
                return;
            }

            matches.push({
                handle : pid,
                address : phandle.address,
                attributes : phandle.attributes
            });

            phandle.required_by[rid] = true;
        }
    );

    return matches;
}

Registry.prototype.doesRequirementWantProvision = function (rhandle, phandle) {
    if (!phandle.activeServer || !phandle.activeClient) {
        return false;
    }

    for (var key in rhandle.attributes) {
        if (!(key in phandle.attributes)) {
            return false;
        } else if (!rhandle.attributes[key].match(phandle.attributes[key])) {
            return false;
        }
    }

    return true;
}

module.exports = Registry;
