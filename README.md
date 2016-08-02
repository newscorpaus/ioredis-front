# ioredis-front

`ioredis-front` is a connection manager for [ioredis](https://github.com/luin/ioredis) connections. 

It is almost transparently the same to connect to redis via this manager as to build a normal ioredis connection with
two benefits:

* connections with identical host and port parameters are reused
* connections can be named, to allow for deliberate duplicate connections

### usage

Both `connect` and `connectByName` return a standard Promise, EventEmitter based [connection](https://github.com/luin/ioredis/blob/master/API.md#Redis+connect) from `ioredis`. 

#### connect

First, instantiate a manager instance:

```
let ioredis = require('ioredis');

let ioredisFront = require('ioredis-front')(ioredis);

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

## Miscellaneous

`ioredis-front` was built as part of tcog - a transformer of APIs. See https://www.youtube.com/watch?v=teJLIUuGqK4 

# Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using ***`npm test`***

# Release History

- **0.1.0** Initial release

# License
Copyright (c) 2015 News Corp Australia. Licensed under the MIT license.