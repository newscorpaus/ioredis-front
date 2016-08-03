'use strict';

/**
 * @ngdoc function
 * @name connect
 *
 * Uses a Promise returned from Ioredis for the connection.
 * Stores new connections again a key (from keymaker) and
 * always checks to reuse pre-existing connections with the same key.
 *
 * @param options
 * @returns an Ioredis Connection: Bluebird Promise, EventEmitter
 */

function connect(options) {
    options = ensureOptions(options);
    let key = keymaker(options);

    options.lazyConnect = true;

    /*
     See below.
     Ioredis docs - https://github.com/luin/Ioredis#auto-reconnect.
     */
    options.retryStrategy = retryStrategy;

    if (connections[key]) {
        return this.connections[key];
    }

    connections[key] = createConnection(options);
    connections[key]._name = key;

    return connections[key];
}

/**
 * @ngdoc function
 * @name deleteConnection
 *
 * Called internally when the 'end' event is triggered on the connection by the server.
 *
 */
function deleteConnection(deadConnection) {
    Object.keys(connections).forEach(function(key) {
        if (connections[key]._name === deadConnection._name) {
            delete connections[key];
        }
    });
}

/**
 * @ngdoc function
 * @name connectByName
 *
 * As with the connect function but allowing for a distinct connection to be maintained
 * by a name. This is useful for when wanting to maintain multiple Ioredis connections
 * to the same server, rather than reusing automatically via connect.
 *
 * @param options
 * @returns an Ioredis Connection: Bluebird Promise, EventEmitter
 */
function connectByName(name, options) {
    options = ensureOptions(options);
    name = "_" + name;

    let oldConn = connections[name];
    let conn;

    if (oldConn) {
        if (options.host !== oldConn.options.host && options.port !== oldConn.options.port) {
            conn = createConnection(options);
            conn._name = name;
        } else {
            conn = oldConn;
        }
    } else {
        conn = createConnection(options);
    }

    connections[name] = conn;
    return conn;
}

/**
 * @ngdoc function
 * @name createConnection
 *
 * Utility function used by connect and connectByName
 */
function createConnection(options) {
    let conn = new Ioredis(options);
    conn = addEvents(conn);
    return conn;
}

/**
 * @ngdoc function
 * @name ejectAll
 *
 * Useful for setting a clean state. Called in tests but exposed for future usefulness to TCOG.
 */
function ejectAll() {
    connections = {};
}

let connections = {};
let Ioredis;

/**
 * @ngdoc function
 * @name module.exports
 *
 * Exposes a 'front' object that allows access to functions for organising Ioredis connections.
 */
module.exports = function(_Ioredis) {
    Ioredis = _Ioredis;

    return {
        connections: connections,
        connect: connect,
        connectByName: connectByName,
        ejectAll: ejectAll
    };
};

/**
 * @ngdoc function
 * @name addEvents
 *
 * Event Reactions for redis connections.
 *
 * Adds event listeners for the lifecycle of an Ioredis connection.
 * See https://nodejs.org/api/events.html#events_class_events_eventemitter
 *
 * @param client
 * @returns a client with the added events
 */
function addEvents(conn) {
    conn.on("end", function() {
            deleteConnection(conn);
        });

    return conn;
}

const MAX_RECONNECT_DELAY = 5000;
const ONE_SECOND = 1000;

/**
 * @ngdoc function
 * @name retryStrategy
 *
 * Retry strategy that begins with 1 second and incrementally backs off until it will continue
 * reconnecting after a 5 second wait.
 *
 * Taken from Ioredis docs for retry strategy and tweaked.
 *
 * See https://github.com/luin/Ioredis#auto-reconnect
 *
 * @param times
 * @returns {number}
 */
function retryStrategy(times) {
    let delay = Math.min(times * ONE_SECOND, MAX_RECONNECT_DELAY);
    return delay;
}

/**
 * @ngdoc function
 * @name keymaker
 *
 * Utility function to generate a default name for the redis connection.
 * Currently only pays attention to url and post, though there are other options to consider
 * in the future.
 *
 * See https://github.com/luin/Ioredis/blob/master/API.md#new-redisport-host-options
 *
 * @param options
 * @returns {string}
 */
function keymaker(options) {
    let key = "";

    if (options.host) {
        key += options.host;
    }

    if (options.port) {
        key += ":" + options.port;
    }

    if (key.length === 0) {
        key = "localhost:6379";
    }

    return key;
}

/**
 * @ngdoc function
 * @name collectOptions
 *
 * Supplies defaults if host or port are missing.
 */
function ensureOptions(options) {
    options = options || {};
    options.host = options.host || 'localhost';
    options.port = options.port || 6379;

    return options;
}