var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

function unsetContext(context, name) {
    var split = 'string' == typeof name ? name.split('.') : name;

    if (1 == split.length) {
        if (split[0] in context) {
            delete context[split[0]];
        }

        return;
    }

    if (!(split[0] in context)) {
        return;
    }

    unsetContext(context[split[0]], split.slice(1));
}

function setContext(context, name, value, overwrite, fullpath) {
    var split = 'string' == typeof name ? name.split('.') : name;

    if (1 == split.length) {
        if (null === value) {
            delete context[name];
        } else if ('object' == typeof value) {
            if (!(name in context)) {
                context[name] = {};
            }

            if ('object' != typeof context[name]) {
                throw new Error('Unable to set object value on a non-object (' + fullpath + ')');
            }

            Object.keys(value).forEach(
                function (iname) {
                    setContext(context[split[0]], iname, value[iname], overwrite, fullpath + '.' + iname);
                }
            );
        } else if (!(split[0] in context) || (overwrite)) {
            context[split[0]] = value;
        }

        return;
    }

    if (!(split[0] in context)) {
        if (('object' == value) || (1 < split.length)) {
            context[split[0]] = {};
        }
    }

    setContext(context[split[0]], split.slice(1), value, overwrite, fullpath)
}

function getContext(context, name, defaultValue, fullpath) {
    var split = 'string' == typeof name ? name.split('.') : name;

    if (!(split[0] in context)) {
        if ('undefined' == typeof defaultValue) {
            throw new Error('Configuration key "' + fullpath + '" is not defined.');
        }

        return defaultValue;
    }

    if (1 == split.length) {
        return context[split[0]];
    }

    return getContext(context[split[0]], split.slice(1), defaultValue, fullpath);
}

function Config() {
    this.config = {};

    this.setDefaults();
}

Config.prototype.setDefaults = function () {
    // none
}

Config.prototype.set = function (name, value, overwrite) {
    setContext(this.config, name, value, 'undefined' == typeof overwrite ? true : overwrite, name);

    return this;
}

Config.prototype.get = function (name, defaultValue) {
    return getContext(this.config, name, defaultValue, name);
}

Config.prototype.has = function (name) {
    try {
        this.get(name);

        return true;
    } catch (error) {
        return false;
    }
}

Config.prototype.unset = function (name) {
    unsetContext(this.config, name);
}

Config.prototype.getFlattenedPairs = function (name, defaultValue) {
    var flattened = [];

    flatten(
        null === name ? this.config : this.get(name, defaultValue),
        function (key, value) {
            flattened.push(key + '=' + value);
        },
        '.' + name
    );

    return flattened;
}

Config.prototype.importArrayPairs = function (config) {
    var that = this;

    if (!config || (0 == config.length)) {
        return;
    }

    var re = new RegExp(/^([^=]+)=(.*)$/);

    config.forEach(
        function (item) {
            var split = re.exec(item);

            that.set(split[1], split[2]);
        }
    );
};

Config.prototype.importObject = function (config) {
    var that = this;

    Object.keys(config).forEach(
        function (key) {
            that.set(key, config[key]);
        }
    );
}

Config.prototype.importFile = function (p) {
    if (null === p) {
        return;
    }

    switch (path.extname(p)) {
        case '.yaml':
        case '.yml':
            data = yaml.safeLoad(fs.readFileSync(p, { encoding : 'utf8' }));

            break;
        case '.json':
            data = JSON.parse(fs.readFileSync(p, { encoding : 'utf8' }))

            break;
        default:
            throw new Error('Unable to detect format based on file name (' + p + ').');
    }

    this.importObject(data);
}

Config.prototype.importFiles = function (files) {
    var that = this;

    files.forEach(
        function (p) {
            that.importFile(p);
        }
    );
}

function flatten(context, callback, fullpath) {
    if ('object' == typeof context) {
        Object.keys(context).sort().forEach(
            function (key) {
                flatten(context[key], callback, fullpath + '.' + key);
            }
        );
    } else {
        callback(fullpath.substring(1), context);
    }
}

Config.prototype.log = function (logger, method, topic) {
    this.iterate(
        function (key, value) {
            logger[method](topic, key + ' = ' + value);
        }
    );
}

Config.prototype.iterate = function (callback) {
    flatten(this.config, callback, '');
}

module.exports = Config;
