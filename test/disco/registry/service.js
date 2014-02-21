var assert = require('assert');
var Service = require('../../../src/disco/registry/service');
var Session = require('../../../src/disco/registry/session');

var logger = require('npmlog');
logger.level = 'silent';

describe('disco/registry/service', function () {
    describe('session management', function () {
        it('should create new sessions', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession()

            assert.notEqual('', session.id);
            assert.equal(session.id, registry.getSession(session.id).id);
        })

        it('should recognize existing sessions', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession()

            assert.equal(true, registry.hasSession(session.id));
        })

        it('should not recognize non-existant sessions', function () {
            var registry = new Service(null, logger);

            assert.equal(false, registry.hasSession('sometin'));
        })

        it('should error when getting non-existant sessions', function () {
            var registry = new Service(null, logger);

            assert.throws(function () { registry.getSession('sometin') });
        })
    });

    describe('provisions', function () {
        it('can add unused provisions', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);

            var pid = registry.addProvision(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    address : {
                        host : '192.0.2.19',
                        port : 30981
                    },
                    attributes : {
                        zone : 'one'
                    }
                }
            );

            assert.equal(pid.length, 36);

            var phandle = registry.getProvision(pid);

            assert.equal(phandle.environment, 'dev');
            assert.equal(phandle.service, 'blog');
            assert.equal(phandle.role, 'mysql-master');
            assert.equal(phandle.endpoint, 'mysql');
            assert.deepEqual(phandle.address, { host : '192.0.2.19', port : 30981 });
            assert.deepEqual(phandle.attributes, { zone : 'one' });
            assert.equal(phandle.session, session.id);
        });

        it('errors when getting non-existant provision', function () {
            var registry = new Service(null, logger);

            assert.throws(
                function () {
                    registry.getProvision('testme');
                }
            );
        })

        it('can drop unused provisions', function (done) {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);

            var pid = registry.addProvision(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    address : {
                        host : '192.0.2.19',
                        port : 30981
                    }
                }
            );

            assert.equal(pid.length, 36);

            registry.dropProvision(
                pid,
                function () {
                    assert.throws(
                        function () {
                            registry.getProvision(pid);
                        }
                    );

                    done();
                }
            );
        });
    })

    describe('requirements', function () {
        it('can add requirements', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);

            var rid = registry.addRequirement(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    attributes : {
                        zone : 'one'
                    }
                }
            );

            assert.equal(rid.length, 36);

            var rhandle = registry.getRequirement(rid);

            assert.equal(rhandle.environment, 'dev');
            assert.equal(rhandle.service, 'blog');
            assert.equal(rhandle.role, 'mysql-master');
            assert.equal(rhandle.endpoint, 'mysql');
            assert.deepEqual(rhandle.attributes, { zone : 'one' });
            assert.equal(rhandle.session, session.id);
        });

        it('can add requirements w/o attributes', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);

            var rid = registry.addRequirement(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql'
                }
            );

            assert.equal(rid.length, 36);

            var rhandle = registry.getRequirement(rid);

            assert.equal(rhandle.environment, 'dev');
            assert.equal(rhandle.service, 'blog');
            assert.equal(rhandle.role, 'mysql-master');
            assert.equal(rhandle.endpoint, 'mysql');
            assert.deepEqual(rhandle.attributes, {});
            assert.equal(rhandle.session, session.id);
        });

        it('errors when getting non-existant requirement', function () {
            var registry = new Service(null, logger);

            assert.throws(
                function () {
                    registry.getRequirement('testme');
                }
            );
        })

        it('can drop unused requirements', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);

            var rid = registry.addRequirement(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    attributes : {
                        zone : 'one'
                    }
                }
            );

            assert.equal(rid.length, 36);

            registry.dropRequirement(rid);

            assert.throws(
                function () {
                    registry.getRequirement(rid);
                }
            );
        });
    })

    describe('.doesProvisionMeetRequirement', function () {
        var registry = new Service(null, logger);

        it('false for inactive server', function () {
            assert.equal(
                registry.doesProvisionMeetRequirement(
                    {
                        activeServer : false,
                        activeClient : false
                    },
                    {}
                ),
                false
            );
        });

        it('true for simple match', function () {
            assert.equal(
                registry.doesProvisionMeetRequirement(
                    {
                        activeServer : true,
                        activeClient : true,
                        attributes : {
                            zone : 'one'
                        }
                    },
                    {
                        attributes_re : {
                            zone : new RegExp('one')
                        }
                    }
                ),
                true
            );
        });

        it('false for simple match', function () {
            assert.equal(
                registry.doesProvisionMeetRequirement(
                    {
                        activeServer : true,
                        activeClient : true,
                        attributes : {
                                zone : 'two'
                        }
                    },
                    {
                        attributes_re : {
                            zone : new RegExp('one')
                        }
                    }
                ),
                false
            );
        });

        it('true for multiple match', function () {
            assert.equal(
                registry.doesProvisionMeetRequirement(
                    {
                        activeServer : true,
                        activeClient : true,
                        attributes : {
                                zone : 'two'
                        }
                    },
                    {
                        attributes_re : {
                            zone : new RegExp('one|two|three')
                        }
                    }
                ),
                true
            );
        });

        it('false for multiple match', function () {
            assert.equal(
                registry.doesProvisionMeetRequirement(
                    {
                        activeServer : true,
                        activeClient : true,
                        attributes : {
                            zone : 'four'
                        }
                    },
                    {
                        attributes_re : {
                            zone : new RegExp('one|two|three')
                        }
                    }
                ),
                false
            );
        });

        it('true for regex', function () {
            assert.equal(
                registry.doesProvisionMeetRequirement(
                    {
                        activeServer : true,
                        activeClient : true,
                        attributes : {
                            zone : 'us-east-1a'
                        }
                    },
                    {
                        attributes_re : {
                            zone : new RegExp('^us-east-')
                        }
                    }
                ),
                true
            );
        });

        it('false for regex', function () {
            assert.equal(
                registry.doesProvisionMeetRequirement(
                    {
                        activeServer : true,
                        activeClient : true,
                        attributes : {
                            zone : 'us-west-1a'
                        }
                    },
                    {
                        attributes_re : {
                            zone : new RegExp('^us-east-')
                        }
                    }
                ),
                false
            );
        });

        it('false for missing provision attribute', function () {
            assert.equal(
                registry.doesProvisionMeetRequirement(
                    {
                        activeServer : true,
                        activeClient : true,
                        attributes : {}
                    },
                    {
                        attributes_re : {
                            zone : new RegExp('^us-east-')
                        }
                    }
                ),
                false
            );
        });
    });

    describe('discovery w/o session', function () {
        it('first provision then require', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);

            var pid = registry.addProvision(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    address : {
                        host : '192.0.2.19',
                        port : 30981
                    },
                    attributes : {
                        zone : 'one'
                    }
                }
            );

            var rid = registry.addRequirement(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    attributes : {
                        zone : 'one'
                    }
                }
            );

            assert.deepEqual(
                registry.discoverRequirements(rid),
                [
                    {
                        id : pid,
                        address : {
                            host : "192.0.2.19",
                            port : 30981
                        },
                        attributes : {
                            zone : "one"
                        }
                    }
                ]
            );
        });

        it('partial provisions match', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);

            var pid1 = registry.addProvision(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    address : {
                        host : '192.0.2.19',
                        port : 30981
                    },
                    attributes : {
                        zone : 'one'
                    }
                }
            );

            var pid2 = registry.addProvision(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    address : {
                        host : '192.0.2.19',
                        port : 30982
                    }
                }
            );

            var pid3 = registry.addProvision(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    address : {
                        host : '192.0.2.19',
                        port : 30983
                    },
                    attributes : {
                        zone : 'two'
                    }
                }
            );

            var rid = registry.addRequirement(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    attributes : {
                        zone : 'one|two'
                    }
                }
            );

            assert.deepEqual(
                registry.discoverRequirements(rid),
                [
                    {
                        id : pid1,
                        address : {
                            host : "192.0.2.19",
                            port : 30981
                        },
                        attributes : {
                            zone : "one"
                        }
                    },
                    {
                        id : pid3,
                        address : {
                            host : "192.0.2.19",
                            port : 30983
                        },
                        attributes : {
                            zone : "two"
                        }
                    }
                ]
            );
        });

        it('non-matching requirement', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);

            var rid = registry.addRequirement(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    attributes : {
                        zone : 'one'
                    }
                }
            );

            assert.deepEqual(
                registry.discoverRequirements(rid),
                []
            );
        });
    })

    describe('discovery w/ session', function () {
        it('first require then provision', function (done) {
            var registry = new Service(null, logger);
            var session = registry.createSession(null, null);
            var pid;

            session.sendCommand = function () {
                var args = arguments;

                process.nextTick(
                    function () {
                        // need to get the pid back in this scope
                        assert.equal(args[0], 'requirement.changed');
                        assert.deepEqual(
                            args[1],
                            {
                                id : rid,
                                action : 'add',
                                endpoints : [
                                    {
                                        id : pid,
                                        address : {
                                            host : "192.0.2.19",
                                            port : 30981
                                        },
                                        attributes : {
                                            zone : "one"
                                        }
                                    }
                                ]
                            }
                        );
                        assert.equal(typeof args[2], 'function');

                        args[2]();

                        done();
                    }
                );
            };

            var rid = registry.addRequirement(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    attributes : {
                        zone : 'one'
                    }
                }
            );

            pid = registry.addProvision(
                session,
                {
                    environment : 'dev',
                    service : 'blog',
                    role : 'mysql-master',
                    endpoint : 'mysql',
                    address : {
                        host : '192.0.2.19',
                        port : 30981
                    },
                    attributes : {
                        zone : 'one'
                    }
                }
            );
        });
    });
})
