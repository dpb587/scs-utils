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
    var id = uuid.v4();

    this.provisionHandles[id] = {
        activeServer : true,
        activeClient : true,
        session : session.id,
        environment : options.environment,
        service : options.service,
        role : options.role,
        endpoint : options.endpoint,
        stat_created : new Date(),
        address : {
            host : options.dhost,
            port : options.dport
        },
        attributes : options.options.attributes || {},
        required_by : {}
    };

    var lookup = getLookupFromOptions(options);

    if (!(lookup in this.discoveryMap)) {
        this.discoveryMap[lookup] = {
            provided_by : {},
            watched_by : {}
        };
    }

    this.discoveryMap[lookup].provided_by[id] = true;

    this.logger.verbose(
        'provision/handle#' + id,
        'added'
    );

    return id;
};

Registry.prototype.getProvisionByHandle = function (id) {
    if (!(id in this.provisionHandles)) {
        throw new Error('Registry does not provide ' + id);
    }

    return this.provisionHandles[id]
}

Registry.prototype.dropProvisionHandle = function (id) {
    if (!(id in this.provisionHandles)) {
        throw new Error('Registry does not provide ' + id);
    }

    var provision = this.provisionHandles[id];

    if (provision.activeServer || provision.activeClient) {
        throw new Error('Provision seems to be active: ' + [ provision.activeServer ? 'server' : '', provision.activeClient ? 'client' : '' ].join(','));
    }

    delete this.provisionHandles[id];
};

/**
 * requirements
 */

Registry.prototype.addRequirementHandle = function (session, options) {
    var id = uuid.v4();

    this.requirementHandles[id] = {
        activeServer : true,
        activeClient : true,
        session : session.id,
        environment : options.environment,
        service : options.service,
        role : options.role,
        endpoint : options.endpoint,
        attributes : options.attributes || {}
    };

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


Registry.prototype.unregisterProvision = function (session, handle, wait, callback) {
    var that = this;
    var provision = session.getProvisionByHandle(handle);
    var ackrem = 0;

    function readyCallback() {
        if (0 < ackrem) {
            return;
        }

        delete this.coremap[provision.lookup][session.id + ':' + handle];

        if (wait) {
            callback();
        }
    }

    this.coremap[provision.lookup][session.id + ':' + handle].forEach(
        function (duokey) {
            var duokey = duokey.split(':');

            that.sessions[duokey[0]].send(
                'requirement.drop',
                [ duokey[1] ],
                function () {
                    ackrem -= 1;

                    delete this.coremap[provision.lookup][session.id + ':' + handle][duokey];

                    readyCallback();
                }
            );

            ackrem += 1;
        }
    );

    if (!wait) {
        callback();
    }
}

Registry.prototype.discoverRequirements = function (rid) {
    var that = this;
    var rhandle = this.getRequirementByHandle(rid);
    var lookup = getLookupFromOptions(rhandle);

    if (!(lookup in this.discoveryMap)) {
        that.logger.error('asdf');
        return {};
    }

    var endpointMap = this.discoveryMap[lookup];

    var attributes = rhandle.attributes;
    var attributeslen = Object.keys(attributes).length;

    for (var key in attributes) {
        attributes[key] = new RegExp(attributes[key]);
    }

    var matches = [];

    Object.keys(endpointMap.provided_by).forEach(
        function (pid) {
            var phandle = that.getProvisionByHandle(pid);

            if (!phandle.activeServer || !phandle.activeClient) {
                return;
            } else if (0 < attributeslen) {
                for (var key in attributes) {
                    if (!(key in phandle.attributes)) {
                        return;
                    } else if (!attributes[key].match(phandle.attributes[key])) {
                        return;
                    }
                }
            }

            matches.push({
                address : phandle.address,
                attributes : phandle.attributes
            });

            phandle.required_by[rid] = true;
        }
    );

    return matches;
}

module.exports = Registry;
