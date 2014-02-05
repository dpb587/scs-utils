var assert = require('assert');
var Service = require('../../../disco/registry/service');

var logger = require('npmlog');
logger.level = 'silent';

describe('disco/registry/service', function () {
    describe('session management', function () {
        it('should create new sessions', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession('socket-mock')

            assert.notEqual('', session.id);
            assert.equal(session.id, registry.getSession(session.id).id);
        })

        it('should recognize existing sessions', function () {
            var registry = new Service(null, logger);
            var session = registry.createSession('socket-mock')

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
        it('can add brand new endpoints', function () {

        })
    })
})
