# ioredis-front

`ioredis-front` is a connection manager for (ioredis)[https://github.com/luin/ioredis] connections. 

It is almost transparently the same to connect to redis via this manager as to build a normal ioredis connection with
three benefits:

* connections with identical host and port parameters are reused
* connections can be named, two allow for deliberate duplicate connections
* improved logging on each ioredis client event

Note - logging conforms to Bunyan but it is easy to specify your own logger. A bundled console logger
is included (see below).

### usage

#### connect

First, instantiate a manager instance:

```
let ioredis = require('ioredis'),
    logger = require('bunyan);

let ioredisFront = require('ioredis-front')(ioredis, logger);

let conn = ioredisFront.connect();
//show output of localhost connection

let conn2 = ioredisFront.connect({ host: 'aws.redis1', port: 6390 });
```

At this stage the connection manager has two physical connections. If you connect using the same 
parameters again in another part of your code, the manager will resuse the existing connection
instead of creating a new one.

#### connectByName

`ConnectByName` allows you to specify that the connection should be stored against its name, rather
than its connection parameters. It is useful when another separate connection is required against 
the same redis instance. For example, we use it internally to create a second redis connection
solely for redis pubsub interacts:

```
    var redisClient     = ioredisFront.connect({ host: redisHost, port: redisPort }),
        redisSubscriber = ioredisFront.connectByName(REDIS_PUB_SUB_CONN,
            { host: redisHost, port: redisPort });
```

### Logger

`ioredis-front` logs event lifecycles from the ioredis connection. 

It uses `fatal`, `error`, and `debug`. It is possible that `info` may be used at some stage.

If you do not want to see logging you might do something like the follow:

```
let ioredis = require('ioredis');

let noop = function(){};

let nologging = {
    debug: noop,
    info: noop,
    error: noop,
    fatal: noop
};


let ioredisFront = require('ioredis-front')(ioredis, logger);

```

For convenience we package a logger that only reports the fatal level to console.error:

```
let ioredis = require('ioredis');

let ioredisFront = require('ioredis-front')(ioredis);

```

## Miscellaneous

`ioredis-front` was built as part of tcog - a transformer of APIs. See https://www.youtube.com/watch?v=teJLIUuGqK4 

# Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using ***`npm test`***

# Release History

- **0.1.0** Initial release

# License
Copyright (c) 2015 News Corp Australia. Licensed under the MIT license.