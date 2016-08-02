'use strict';

let expect = require('chai').expect,
    EventEmitter = require('events');

let implementation    = require('./../../'),
    getImplementation = function(deps) {
        deps.logger = deps.logger;
        return implementation(deps.ioredis, deps.logger);
    };

let ioredis = function(options) {
    let fakeConn = new EventEmitter();
    fakeConn.options = options;
    return fakeConn;
};

let deps = {
    ioredis: ioredis,
    logger: {
        debug: console.log,
        info: console.log,
        error: console.error,
        fatal: console.error
    }
};

describe('ejectAll', function() {
    it('removes all connections', function() {
        getImplementation(deps).connect({ host: 'localhost', port: 6357 });
        getImplementation(deps).ejectAll();
        expect(Object.keys(getImplementation(deps).connections).length).to.equal(0);
    });
});

describe('beginning with 0 connections', function() {
    beforeEach(function() {
        getImplementation(deps).ejectAll();
    });

    describe('connections are reused based on host and port options', function() {
        it('creates 1 connection with identical input of host and port', function() {
            getImplementation(deps).connect({ host: 'localhost', port: 6357 });
            getImplementation(deps).connect({ host: 'localhost', port: 6357 });
            expect(Object.keys(getImplementation(deps).connections).length).to.equal(1);
        });

        it('creates multiple connections with distinct input of host and port', function() {
            getImplementation(deps).connect({ host: 'localhost', port: 6357 });
            getImplementation(deps).connect({ host: '127.0.0.1', port: 6357 });
            expect(Object.keys(getImplementation(deps).connections).length).to.equal(2);
        });
    });

    describe('connection _name is comprised of host and port', function() {
        it('forms  based on host and port', function() {
            ioredis.prototype.connect = function(cb) {};
            let conn = getImplementation(deps).connect({ host: 'localhost', port: 6357 });
            expect(getImplementation(deps).connections['localhost:6357']._name).to.equal(conn._name);
        });
    });

    describe('hooking into the ioredis connection event lifecycle', function() {
        describe('error', function() {
            it('logs an error if an error on the connection is emitted', function() {
                let called = false;
                deps.logger = {
                    info: function() {},
                    error: function() {
                        called = true;
                    }
                };

                let conn = getImplementation(deps).connect({ host: 'localhost', port: 6357 });
                conn._events.error({ code: 'test error' });
                expect(called).to.be.true;
            });
        });

        describe('end', function() {
            it('deletes the connection from the internal connections object when end is emitted', function() {
                deps.logger = {
                    debug: function() {},
                    info: function() {},
                    error: function() {}
                };

                let conn = getImplementation(deps).connect({ host: 'localhost', port: 6357 });
                conn._events.end();
                expect(Object.keys(getImplementation(deps).connections).length).to.equal(0);
            });
        });

        describe('generic logging events', function() {
            let events = [ {
                event: 'close',
                level: 'fatal'
            }, {
                event: 'connect',
                level: 'debug'
            }, {
                event: 'ready',
                level: 'debug'
            }, {
                event: 'reconnecting',
                level: 'debug'
            }];

            events.forEach(function(option) {
                it('logs ' + option.event + ' at level ' + option.level, function() {
                    let called = false;
                    deps.logger = {};
                    deps.logger[option.level] = function() {
                        called = true;
                    };

                    //info level is used by redis front generally
                    //if we eventually need to test it we'll have to count how many times it's called
                    deps.logger.info = function(){};

                    let conn = getImplementation(deps).connect({ host: 'localhost', port: 6357 });
                    conn._events[option.event]();
                });
            });
        });
    });
});

describe('adding a unique connection', function() {
    beforeEach(function() {
        getImplementation(deps).ejectAll();
    });

    it('allows distinct connections to be created via a name', function() {
        let conn = getImplementation(deps).connectByName('analytics', { host: 'localhost', port: 6358 });
        expect(conn).to.be.ok;
        Object.keys(getImplementation(deps).connections).length === 1;
    });

    it('maintains one connection per name', function() {
        getImplementation(deps).connectByName('analytics', { host: 'localhost', port: 6358 });
        getImplementation(deps).connectByName('analytics', { host: '127.0.0.1', port: 1111 });
        Object.keys(getImplementation(deps).connections).length === 1;
    });

    it('implicitly replaces by name ', function() {
        getImplementation(deps).connectByName('analytics', { host: 'localhost', port: 6358 });
        let conn = getImplementation(deps).connectByName('analytics', { host: '127.0.0.1', port: 1111 });
        expect(conn.options.host).to.equal('127.0.0.1');
        expect(conn.options.port).to.equal(1111);
    });
});

describe('the default logger', function() {
    let original;

    beforeEach(function() {
        original = console.error;
    });

    afterEach(function() {
        console.error = original;
    })

    it('on connection close calls logger.fatal which maps to console.error', function(done) {
        process.stderr.write = function() { done() };
        let conn = getImplementation({ ioredis: ioredis }).connect();
        conn.emit('close');
    });
});
