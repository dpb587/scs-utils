var http = require('http');

function loadRouting() {
    var routing = require('./routing');

    routing.forEach(
        function (route) {
            if (!('match' in route)) {
                var keys = [];
                var regex = route.url.replace(
                    /\{([^}]+)\}/g,
                    function (match, name) {
                        keys.push(name);

                        return '([^/]+)';
                    }
                );
                regex = new RegExp('^' + regex + '$');

                route.match = function (method, url) {
                    var vals, maps = {};

                    if (route.method != method) {
                        return false;
                    } else if (null === (vals = regex.exec(url))) {
                        return false;
                    }

                    keys.forEach(
                        function (j) {
                            maps[keys[j]] = vals[j + 1];
                        }
                    );

                    return maps;
                }
            }
        }
    );

    return routing;
}

function sendSmartResponse(request, response, data) {
    response.write('<html><style type="text/css">a{color:#000066;}</style><body><pre><code>');
    response.write(JSON.stringify(data, null, 2).replace(/(\{\s+"url": ")([^"]+)(")(,\s+"title": "[^"]+"|)(\s+\})/g, '$1<a href="$2">$2</a>$3$4$5'));
    response.write('</code></pre></body>');
    response.end();
}

function Service(context, options, logger) {
    options = options || {};
    options.listen = options.listen || {};
    options.listen.host = options.listen.host || '127.0.0.1';
    options.listen.port = options.listen.port || '9641';

    this.context = context;
    this.options = options;
    this.logger = logger;
    this.server = null;
    this.routes = loadRouting();
}

Service.prototype.start = function (callback) {
    var that = this;

    if (this.server) {
        callback();
    }

    this.server = new http.createServer();
    this.server.on('listening', function () {
        that.logger.info('http', 'ready for connections');
    });
    this.server.on('request', function (request, response) {
        that.logger.verbose('http/request', request.socket.remoteAddress + ' ' + request.method + ' ' + request.url);

        var params;
        var route = null;

        that.routes.some(
            function (test) {
                if (false !== (params = test.match(request.method, request.url))) {
                    route = test;

                    return true;
                }
            }
        );

        if (route) {
            that.logger.silly('http/request/routing', route.url);

            var result = route.handle(that.context, request, response, params);

            if (null !== result) {
                sendSmartResponse(request, response, result);
            }
        } else {
            response.writeHead(404);
            response.end('Not Found');
        }
    });
    this.server.on('close', function () {
        that.logger.verbose('http', 'stopped listening');
    });
    this.server.on('error', function (error) {
        that.logger.error('http', error.message);

        throw error;
    });

    if (callback) this.server.on('listening', callback);

    this.logger.silly('http', 'starting...');

    this.server.listen(this.options.listen.port, this.options.listen.host);
};

Service.prototype.stop = function (callback) {
    if (callback) this.server.on('close', callback);

    this.logger.silly('http', 'stopping...');

    this.server.close();
}

module.exports = Service;
