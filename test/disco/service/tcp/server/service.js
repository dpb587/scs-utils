var assert = require('assert');
var Service = require('../../../../../src/disco/service/tcp/server/service');

var logger = require('npmlog');
logger.level = 'silent';

describe('disco/service/tcp/server/service', function () {
    describe('server basics', function () {
        it('starts and stops', function (done) {
            var service = new Service(
                null,
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
