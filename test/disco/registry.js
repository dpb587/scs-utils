var assert = require('assert');
var Registry = require('../../disco/registry');
var Session = require('../../disco/session');

var logger = require('npmlog');
logger.level = 'silent';

describe('Registry', function () {
    describe('addSession', function () {
        it('should accept the session', function () {
            var registry = new Registry(null, logger);
            var session = new Session('testme', {}, logger);
            registry.addSession(session);
        })
    })

    describe('hasSession', function () {
        it('should return false if not joined', function () {
            var registry = new Registry(null, logger);
            var session = new Session('testme', {}, logger);
            assert.equal(registry.hasSession(session), false);
        })

        it('should return true if joined', function () {
            var registry = new Registry(null, logger);
            var session = new Session('testme', {}, logger);
            registry.addSession(session);
            assert.equal(registry.hasSession(session), true);
        })
    })

    describe('getSession', function () {
        it('should throw an error if not exist', function () {
            var registry = new Registry(null, logger);
            assert.throws(
                function () {
                    registry.getSession('testme');
                },
                Error
            );
        })

        it('should return an existing session', function () {
            var registry = new Registry(null, logger);
            var session = new Session('testme', {}, logger);
            registry.addSession(session);
            assert.strictEqual(registry.getSession('testme'), session);
        })
    })
})
