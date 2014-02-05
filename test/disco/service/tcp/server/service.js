var assert = require('assert');
var Service = require('../../../../../src/disco/service/tcp/server/service');
var Commander = require('../../../../../src/disco/service/commander');

var logger = require('npmlog');
logger.level = 'silent';

describe('disco/service/tcp/server/service', function () {
    describe('.cleanupCommandArgs', function () {
        it('errors on missing args', function () {
            var service = new Service(null, new Commander(null), null, logger);

            assert.throws(
                function () {
                    service.cleanupCommandArgs(
                        {
                            args : {
                                reqme : {
                                    required : true
                                }
                            }
                        },
                        {}
                    );
                },
                SyntaxError
            );
        })

        it('errors on extra args', function () {
            var service = new Service(null, new Commander(null), null, logger);

            assert.throws(
                function () {
                    service.cleanupCommandArgs(
                        {
                            args : {}
                        },
                        {
                            nonme : 'nope'
                        }
                    );
                },
                SyntaxError
            );
        })

        it('injects null for non-required default', function () {
            var service = new Service(null, new Commander(null), null, logger);
            var args = service.cleanupCommandArgs(
                {
                    args : {
                        reqme : {
                            required : false
                        }
                    }
                },
                {}
            );

            assert.strictEqual(args.reqme, null);
        })

        it('invokes validate when available', function () {
            var service = new Service(null, new Commander(null), null, logger);
            var args = service.cleanupCommandArgs(
                {
                    args : {
                        addme : {}
                    },
                    validate : function (args) {
                        args.addme += 1;

                        return args;
                    }
                },
                {
                    addme : 1
                }
            );

            assert.strictEqual(args.addme, 2);
        })
    });

    describe('server basics', function () {
        it('starts and stops', function (done) {
            var service = new Service(
                null,
                new Commander(null),
                {
                    listen : {
                        port : 0
                    }
                },
                logger
            );

            service.start(
                function () {
                    service.stop(
                        function () {
                            done();
                        }
                    );
                }
            );
        })

        it('errors cleanly (test assuming non-root)', function (done) {
            var service = new Service(
                null,
                new Commander(null),
                {
                    listen : {
                        port : 22
                    }
                },
                logger
            );

            service.start(
                function (error) {
                    assert.equal(error.message, 'listen EACCES');

                    done();
                }
            );
        })
    })
});
