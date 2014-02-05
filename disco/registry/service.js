var uuid = require('node-uuid');
var Session = require('./session');

function getLookupFromOptions(options) {
    return options.environment + '/' + options.service + '/' + options.role + '/' + options.endpoint;
}

function Service(options, logger) {
    var options = options || {};

    this.options = options;
    this.logger = logger;

    this.sessions = {};
    this.provisionHandles = {};
    this.requirementHandles = {};
    this.discoveryMap = {};
}

Service.prototype.createSession = function (socket, options) {
    var session = new Session(this, options, this.logger);
    session.attach(socket);

    this.sessions[session.id] = session;
    
    return session;
};

Service.prototype.destroySession = function (session) {
    throw new Error('@todo');
}

Service.prototype.hasSession = function (id) {
    return id in this.sessions;
};

Service.prototype.getSession = function (id) {
    if (!(id in this.sessions)) {
        throw new Error('Session is not available.');
    }

    return this.sessions[id];
};

/**
 * provisions
 */

Service.prototype.addProvision = function (session, options) {
    var that = this;

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
        'provision#' + pid,
        'added'
    );

    // see if anyone cares about this
    for (var rid in this.discoveryMap[lookup].watched_by) {
        if (!this.discoveryMap[lookup].watched_by[rid]) {
            // being terminated
            continue;
        }

        var rhandle = this.requirementHandles[rid];

        if (!this.doesProvisionMeetRequirement(phandle, rhandle)) {
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
            function (error, result) {
                if (error) {
                    delete phandle.required_by[rid];

                    that.logger.error(
                        that.loggerTopic,
                        'Client did not acknowledge requirement change: ' + error.name + ': ' + error.message
                    );
                }
            }
        );
    }

    return pid;
};

Service.prototype.getProvision = function (pid) {
    if (!(pid in this.provisionHandles)) {
        throw new Error('Registry does not provide ' + pid);
    }

    return this.provisionHandles[pid]
}

Service.prototype.dropProvision = function (pid, callback) {
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

        this.logger.verbose(
            'provision#' + pid,
            'dropped'
        );

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

Service.prototype.addRequirement = function (session, options) {
    var rid = uuid.v4();

    var attributes_re = options.attributes || {};

    for (var key in attributes_re) {
        attributes_re[key] = new RegExp(attributes_re[key]);
    }

    this.requirementHandles[rid] = {
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

    this.discoveryMap[lookup].watched_by[rid] = true;


    return rid;
};

Service.prototype.getRequirement = function (rid) {
    if (!(rid in this.requirementHandles)) {
        throw new Error('Registry does not require ' + rid);
    }

    return this.requirementHandles[rid]
}

Service.prototype.dropRequirement = function (rid) {
    if (!(rid in this.requirementHandles)) {
        throw new Error('Registry does not require ' + rid);
    }

    var rhandle = this.requirementHandles[rid];

    if (rhandle.activeServer || rhandle.activeClient) {
        throw new Error('Requirement seems to be active: ' + [ rhandle.activeServer ? 'server' : '', rhandle.activeClient ? 'client' : '' ].join(','));
    }

    delete this.requirementHandles[rid];
};

Service.prototype.discoverRequirements = function (rid) {
    var that = this;
    var rhandle = this.getRequirement(rid);
    var lookup = getLookupFromOptions(rhandle);

    if (!(lookup in this.discoveryMap)) {
        that.logger.error('asdf');
        return {};
    }

    var endpointMap = this.discoveryMap[lookup];

    var matches = [];

    Object.keys(endpointMap.provided_by).forEach(
        function (pid) {
            var phandle = that.getProvision(pid);

            if (!that.doesProvisionMeetRequirement(phandle, rhandle)) {
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

Service.prototype.doesProvisionMeetRequirement = function (phandle, rhandle) {
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

module.exports = Service;
