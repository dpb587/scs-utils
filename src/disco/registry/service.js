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

Service.prototype.createSession = function (options) {
    var session = new Session(this, options, this.logger);

    this.sessions[session.id] = session;
    
    return session;
};

Service.prototype.destroySession = function (id, callback) {
    var that = this;
    var remain = 0;

    function finish() {
        if (remain > 0) {
            return;
        }

        callback();
    }

    Object.keys(this.provisionHandles).forEach(
        function (pid) {
            if (id != that.provisionHandles[pid].session) {
                return;
            }

            remain += 1;

            that.dropProvision(
                pid,
                function () {
                    remain -= 1;

                    finish();
                }
            );
        }
    );

    Object.keys(this.requirementHandles).forEach(
        function (rid) {
            if (id != that.requirementHandles[rid].session) {
                return;
            }

            that.dropRequirement(rid);
        }
    );

    finish();
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
        environment : options.environment,
        service : options.service,
        role : options.role,
        endpoint : options.endpoint,
        address : options.address,
        attributes : options.attributes || {},

        activeServer : true,
        activeClient : true,
        session : session.id,
        required_by : {},
        stat_created_at : new Date(),
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

    that.sendNewProvisionToRequirements(pid, phandle);

    return pid;
}

Service.prototype.sendNewProvisionToRequirements = function (pid, phandle) {
    var lookup = getLookupFromOptions(phandle);

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
        rhandle.provided_by[pid] = true;

        this.sessions[rhandle.session].sendCommand(
            'requirement.changed',
            {
                id : rid,
                action : 'add',
                endpoints : [
                    {
                        id : pid,
                        address : phandle.address,
                        attributes : phandle.attributes
                    }
                ]
            },
            function (error, result) {
                if (error) {
                    delete phandle.required_by[rid];
                    delete rhandle.provided_by[pid];

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

    var phandle = this.getProvision(pid);
    var lookup = getLookupFromOptions(phandle);

    phandle.activeServer = false;

    var ackrem = 0;

    function readyCallback() {
        if (0 < ackrem) {
            return;
        }

        delete that.provisionHandles[pid];
        delete that.discoveryMap[lookup].provided_by[pid];

        that.logger.verbose(
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

            var rhandle = that.getRequirement(rid);

            phandle.required_by[rid] = false;
            rhandle.provided_by[pid] = false;

            that.sessions[rhandle.session].sendCommand(
                'requirement.changed',
                {
                    id : rid,
                    action : 'drop',
                    endpoints : [
                        {
                            id : pid,
                            address : phandle.address,
                            attributes : phandle.attributes
                        }
                    ]
                },
                function () {
                    ackrem -= 1;

                    delete phandle.required_by[rid];
                    delete rhandle.provided_by[pid];

                    readyCallback();
                }
            );

            ackrem += 1;
        }
    );

    readyCallback();
}

/**
 * requirements
 */

Service.prototype.addRequirement = function (session, options) {
    var rid = uuid.v4();

    var attributes = options.attributes || {};
    var attributes_re = {};

    for (var key in attributes) {
        attributes_re[key] = new RegExp(attributes[key]);
    }

    this.requirementHandles[rid] = {
        environment : options.environment,
        service : options.service,
        role : options.role,
        endpoint : options.endpoint,
        attributes : attributes,

        activeServer : true,
        activeClient : true,
        session : session.id,
        attributes_re : attributes_re,
        stat_created_at : new Date(),
        provided_by : {}
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
    var that = this;

    var rhandle = this.getRequirement(rid);
    var lookup = getLookupFromOptions(rhandle);

    delete this.discoveryMap[lookup].watched_by[rid];

    Object.keys(rhandle.provided_by).forEach(
        function (pid) {
            delete that.getProvision(pid).required_by[rid];
        }
    );

    delete this.requirementHandles[rid];
};

Service.prototype.discoverRequirements = function (rid) {
    var that = this;
    var rhandle = this.getRequirement(rid);
    var lookup = getLookupFromOptions(rhandle);

    var endpointMap = this.discoveryMap[lookup];

    var matches = [];

    Object.keys(endpointMap.provided_by).forEach(
        function (pid) {
            var phandle = that.getProvision(pid);

            if (!that.doesProvisionMeetRequirement(phandle, rhandle)) {
                return;
            }

            matches.push({
                id : pid,
                address : phandle.address,
                attributes : phandle.attributes
            });

            phandle.required_by[rid] = true;
            rhandle.provided_by[pid] = true;
        }
    );

    return matches;
}

Service.prototype.doesProvisionMeetRequirement = function (phandle, rhandle) {
    if (!phandle.activeServer || !phandle.activeClient) {
        return false;
    }

    for (var key in rhandle.attributes_re) {
        if (!(key in phandle.attributes)) {
            return false;
        } else if (!rhandle.attributes_re[key].exec(phandle.attributes[key])) {
            return false;
        }
    }

    return true;
}

module.exports = Service;
