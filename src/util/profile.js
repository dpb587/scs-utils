var crypto = require('crypto');
var fs = require('fs');
var os = require('os');

var Config = require('./config');
var Workflow = require('./workflow');
var utilfs = require('./fs');

// --

function Profile (cruntime, ccompiled, logger) {
    this.cruntime = cruntime;
    this.ccompiled = ccompiled;
    this.logger = logger;

    this.names = null;
    this.imageCache = null;
    this.imageConfig = null;
    this.imageEngine = null;
    this.imageSource = null;
    this.imageLogs = null;
}

// --

Profile.prototype.createContainer = function (callback) {
    var mtype = require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container');
    var engine = this.getImageEngine();

    engine.generateId(
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            var container = new mtype(
                result,
                new Config(this.ccompiled.get('image')),
                new Config(this.ccompiled.get('container')),
                this.logger
            );

            callback(null, container);
        }.bind(this)
    );
}

Profile.prototype.createTemporaryDirectory = function (callback) {
    var bp = '/var/lib/scs-utils/tmp';

    utilfs.mkdirRecursiveSync(bp, 0700);

    var p = bp + '/scs-' + this.ccompiled.get('compiled.id.hash');

    utilfs.mkdirRecursiveSync(p, 0755);

    callback(null, p);
}

Profile.prototype.importFromCache = function (callback) {
    var that = this;
    var tmppath = os.tmpdir() + '/scs-' + this.ccompiled.get('image.id.uid');

    this.getImageCache().get(
        'scs-' + this.ccompiled.get('image.id.uid'),
        tmppath,
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            that.getImageEngine().importCachedImage(
                tmppath,
                function (error, result) {
                    //fs.unlinkSync(tmppath);

                    if (error) {
                        callback(error);

                        return;
                    }

                    callback();
                }
            );
        }
    );
}

Profile.prototype.exportToCache = function (callback) {
    var that = this;
    var tmppath = os.tmpdir() + '/scs-' + this.ccompiled.get('image.id.uid');

    that.getImageEngine().exportCachedImage(
        tmppath,
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            that.getImageCache().put(
                'scs-' + that.ccompiled.get('image.id.uid'),
                tmppath,
                function (error, result) {
                    fs.unlinkSync(tmppath);

                    if (error) {
                        callback(error);

                        return;
                    }

                    callback();
                }
            );
        }
    );
}

Profile.prototype.build = function (callback) {
    var that = this;
    var workflow = new Workflow(this, this.logger, 'build');

    workflow.pushStep(
        'check',
        function (workflow, callback1) {
            this.getImageEngine().hasImage(
                function (error, exists) {
                    if (error) {
                        callback1(error);

                        return;
                    } else if (exists) {
                        callback1();

                        return;
                    }

                    if (that.getImageCache().isAvailable()) {
                        workflow.unshiftStep(
                            'cache-check',
                            function (workflow, callback2) {
                                this.getImageCache().has(
                                    'scs-' + this.ccompiled.get('image.id.uid'),
                                    function (error, exists1) {
                                        if (error) {
                                            callback2(error);

                                            return;
                                        } else if (exists1) {
                                            workflow.unshiftStep(
                                                'cache-get',
                                                function (workflow, callback3) {
                                                    that.importFromCache(callback3);
                                                }
                                            );

                                            callback2();

                                            return;
                                        }

                                        workflow.unshiftStep(
                                            'rebuild',
                                            function (workflow, callback3) {
                                                this.rebuild(callback3);
                                            }
                                        )

                                        callback2();
                                    }
                                );
                            }
                        );
                    } else {
                        workflow.unshiftStep(
                            'rebuild',
                            function (workflow, callback3) {
                                this.rebuild(callback3);
                            }
                        )
                    }

                    callback1();
                }
            );
        }
    );

    workflow.run(callback);
}

Profile.prototype.rebuild = function (callback) {
    var workflow = new Workflow(this, this.logger, 'rebuild');
    var tmpdir;

    workflow.pushStep(
        'tmpdir',
        function (workflow, callback1) {
            this.createTemporaryDirectory(
                function (error, result) {
                    tmpdir = result;

                    callback1(error, result);
                }
            );
        }
    );

    workflow.pushStep(
        'source',
        function (workflow, callback1) {
            this.getImageSource().createWorkingDirectory(
                tmpdir,
                callback1
            );
        }
    );

    workflow.pushStep(
        'config',
        function (workflow, callback1) {
            this.getImageConfig().build(
                tmpdir,
                callback1
            );
        }
    );

    workflow.pushStep(
        'engine',
        function (workflow, callback1) {
            this.getImageEngine().build(
                tmpdir,
                callback1
            );
        }
    );

    if (this.getImageCache().isAvailable()) {
        workflow.pushStep(
            'cache-put',
            function (workflow, callback1) {
                this.exportToCache(callback1);
            }
        );
    }

    workflow.run(callback);
}

Profile.prototype.recompile = function (callback) {
    this.ccompiled = new Config();

    var workflow = new Workflow(this, this.logger, 'recompile');
    workflow.pushStep('global', recompileGlobal);
    workflow.pushStep('image/source', recompileImageSource);
    workflow.pushStep('image/cache', recompileImageCache);
    workflow.pushStep('image', recompileImageManifest);
    workflow.pushStep('image/id', recompileImageUid);
    workflow.pushStep('container', recompileContainer);
    workflow.pushStep('compiled/id', recompileCompiledUid);

    workflow.run(callback);
};

Profile.prototype.compile = function (callback) {
    var workflow = new Workflow(this, this.logger, 'compile');

    workflow.pushStep(
        'check',
        function (workflow, callback1) {
            if (!this.isCompiled()) {
                workflow.unshiftStep(
                    'recompile',
                    function (workflow, callback2) {
                        this.recompile(callback2);
                    }
                );
            }

            callback1();
        }
    );

    workflow.run(callback);
}

function recompileImageUid (workflow, callback) {
    this.ccompiled.set('image.id.uid', this.recalculateCompiledUid());

    callback();
};

Profile.prototype.isCompiled = function () {
    return this.ccompiled.has('compiled.id.hash');
}

Profile.prototype.needsRecompilation = function () {
    return this.ccompiled.get('compiled.id.hash', null) != this.recalculateCompiledUid();
}

Profile.prototype.recalculateCompiledUid = function () {
    var hash, data;

    var uidhash = crypto.createHash('sha1');

    hash = crypto.createHash('sha1');
    data = this.cruntime.getFlattenedPairs('image.config', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('config: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.cruntime.getFlattenedPairs('image.engine', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('engine: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.cruntime.getFlattenedPairs('image.logs', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('logs: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.cruntime.getFlattenedPairs('image.provide', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('provide: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.cruntime.getFlattenedPairs('image.require', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('require: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.cruntime.getFlattenedPairs('image.volume', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('volume: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.cruntime.getFlattenedPairs('image.source', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('source: ' + hash.digest('hex') + '\n');

    return uidhash.digest('hex');
}

function recompileCompiledUid (workflow, callback) {
    this.ccompiled.set('compiled.id.hash', this.recalculateCompiledUid());

    callback();
};

function recompileGlobal (workflow, callback) {
    this.ccompiled.set('global', this.cruntime.get('global', {}));

    callback();
}

function recompileImageCache (workflow, callback) {
    this.ccompiled.set('image.cache', null);

    var cacheMethod = this.cruntime.get('image.cache.method', 'disabled');

    this.ccompiled.set(
        'image.cache',
        require('../image/cache/' + cacheMethod + '/compiler').compileImageConfig(
            [
                this.cruntime.get('image.cache.options', {})
            ]
        )
    );

    this.ccompiled.set('image.cache._method', cacheMethod);

    callback();
}

function recompileImageManifest (workflow, callback) {
    this.getImageSource().reloadImageManifest(
        function (error, cimageraw) {
            if (error) {
                callback(error);

                return;
            }

            var cimage = new Config(cimageraw);

            this.ccompiled.set('image.engine', null);

            if (!this.cruntime.has('image.engine.method')) {
                throw new Error('Runtime configuration is missing image.engine.method');
            }

            var engineMethod = this.cruntime.get('image.engine.method');

            this.ccompiled.set(
                'image.engine',
                require('../image/engine/' + engineMethod + '/compiler').compileImageConfig(
                    [
                        this.ccompiled.get('global.image.engine.' + engineMethod, {}),
                        cimage.get('engine.' + engineMethod),
                        this.cruntime.get('image.engine.options', {})
                    ]
                )
            );

            this.ccompiled.set('image.engine._method', engineMethod);


            this.ccompiled.set('image.config', null);

            if (!cimage.has('config.method')) {
                throw new Error('Image configuration is missing config.method');
            }

            var configMethod = cimage.get('config.method');

            this.ccompiled.set(
                'image.config',
                require('../image/config/' + configMethod + '/compiler').compileImageConfig(
                    [
                        this.ccompiled.get('global.image.config', {}),
                        cimage.get('config.options', {}),
                        this.cruntime.get('image.config', {})
                    ]
                )
            );

            this.ccompiled.set('image.config._method', configMethod);


            this.ccompiled.set(
                'image.logs',
                require('../image/logs/compiler').compileImageConfig(
                    [
                        this.ccompiled.get('global.image.logs', {}),
                        cimage.get('logs')
                    ]
                )
            );


            this.ccompiled.set('image.provide', null);

            var provideMap = cimage.get('provide', {});

            Object.keys(provideMap).forEach(
                function (key) {
                    this.ccompiled.set(
                        'image.provide.' + key,
                        require('../image/provide/compiler').compileImageConfig(
                            key,
                            [
                                this.ccompiled.get('global.image.provide._default', {}),
                                provideMap[key]
                            ]
                        )
                    );
                }.bind(this)
            );


            this.ccompiled.set('image.require', null);

            var requireMap = cimage.get('require', {});

            Object.keys(requireMap).forEach(
                function (key) {
                    this.ccompiled.set(
                        'image.require.' + key,
                        require('../image/require/compiler').compileImageConfig(
                            key,
                            [
                                this.ccompiled.get('global.image.require._default', {}),
                                requireMap[key]
                            ]
                        )
                    );
                }.bind(this)
            );


            this.ccompiled.set('image.volume', null);

            var volumeMap = cimage.get('volume', {});

            Object.keys(volumeMap).forEach(
                function (key) {
                    this.ccompiled.set(
                        'image.volume.' + key,
                        require('../image/volume/compiler').compileImageConfig(
                            key,
                            [
                                this.ccompiled.get('global.image.volume._default', {}),
                                volumeMap[key]
                            ]
                        )
                    );
                }.bind(this)
            );


            callback();
        }.bind(this)
    );
}

function recompileContainer (workflow, callback) {
    this.ccompiled.set('container.name', null);

    this.ccompiled.set('container.name.environment', this.cruntime.get('container.name.environment', 'default'));
    this.ccompiled.set('container.name.service', this.cruntime.get('container.name.service', 'default'));
    this.ccompiled.set('container.name.role', this.cruntime.get('container.name.role', 'default'));
    this.ccompiled.set(
        'container.name.local',
        this.cruntime.get(
            'container.name.local',
            this.ccompiled.get('container.name.environment') + '-' + this.ccompiled.get('container.name.service') + '-' + this.ccompiled.get('container.name.role')
        )
    );

    var engineMethod = this.ccompiled.get('image.engine._method');

    this.ccompiled.set(
        'container.engine',
        require('../image/engine/' + engineMethod + '/compiler').compileContainerConfig(
            this.getContainerNames(),
            [
                this.ccompiled.get('global.container.engine.' + engineMethod, {}),
                this.cruntime.get('container.engine', {})
            ]
        )
    );


    this.ccompiled.set('container.provide', null);

    var provideMap = this.cruntime.get('container.provide', {});

    Object.keys(provideMap).forEach(
        function (key) {
            var method = 'method' in provideMap[key]
                ? provideMap[key].method
                : this.ccompiled.get('global.container.provide._default._method', {})
                ;

            this.ccompiled.set(
                'container.provide.' + key,
                require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container/provide/' + provideMap[key].method + '/compiler').compileContainerConfig(
                    this.getContainerNames(),
                    key,
                    [
                        this.ccompiled.get('global.container.provide.' + method, {}),
                        'options' in provideMap[key] ? provideMap[key].options : {}
                    ]
                )
            );

            this.ccompiled.set('container.provide.' + key + '.method', null);
            this.ccompiled.set('container.provide.' + key + '._method', method);
        }.bind(this)
    );


    this.ccompiled.set('container.require', null);

    var requireMap = this.cruntime.get('container.require', {});

    Object.keys(requireMap).forEach(
        function (key) {
            var method = 'method' in requireMap[key]
                ? requireMap[key].method
                : this.ccompiled.get('global.container.require._default._method')
                ;

            this.ccompiled.set(
                'container.require.' + key,
                require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container/require/' + requireMap[key].method + '/compiler').compileContainerConfig(
                    this.getContainerNames(),
                    key,
                    [
                        this.ccompiled.get('global.container.require.' + method, {}),
                        'options' in requireMap[key] ? requireMap[key].options : {}
                    ]
                )
            );

            this.ccompiled.set('container.require.' + key + '.method', null);
            this.ccompiled.set('container.require.' + key + '._method', method);
        }.bind(this)
    );


    this.ccompiled.set('container.volume', null);

    var volumeMap = this.cruntime.get('container.volume', {});

    Object.keys(volumeMap).forEach(
        function (key) {
            var method = 'method' in volumeMap[key]
                ? volumeMap[key].method
                : this.ccompiled.get('global.container.volume._default._method')
                ;

            this.ccompiled.set(
                'container.volume.' + key,
                require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container/volume/' + volumeMap[key].method + '/compiler').compileContainerConfig(
                    this.getContainerNames(),
                    key,
                    [
                        this.ccompiled.get('global.container.volume.' + method, {}),
                        'options' in volumeMap[key] ? volumeMap[key].options : {}
                    ]
                )
            );

            this.ccompiled.set('container.volume.' + key + '.method', null);
            this.ccompiled.set('container.volume.' + key + '._method', method);
        }.bind(this)
    );


    this.ccompiled.set('container.network', null);

    var networkMethod = this.cruntime.get('container.network.method', 'default');

    this.ccompiled.set(
        'container.network',
        require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container/network/' + networkMethod + '/compiler').compileContainerConfig(
            this.getContainerNames(),
            [
                this.cruntime.get('container.network.options', {})
            ]
        )
    );

    this.ccompiled.set('container.network._method', networkMethod);


    this.ccompiled.set('container.logs', null);

    var logsMethod = this.cruntime.get('container.logs.method', 'lumberjack');

    this.ccompiled.set(
        'container.logs',
        require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container/logs/' + logsMethod + '/compiler').compileContainerConfig(
            this.getContainerNames(),
            [
                this.cruntime.get('container.logs.options', {})
            ]
        )
    );

    this.ccompiled.set('container.logs._method', networkMethod);


    callback();
}

function recompileImageSource (workflow, callback) {
    this.ccompiled.set('image.source', null);

    if (!this.cruntime.has('image.source.type')) {
        throw new Error('Runtime configuration is missing source.type');
    }

    var sourceConfig = new Config(this.cruntime.get('image.source'));
    var sourceMethod = sourceConfig.get('type');
    sourceConfig.set('type', null);

    this.ccompiled.set(
        'image.source',
        require('../image/source/' + sourceMethod + '/compiler').compileImageConfig(
            [ sourceConfig.config ]
        )
    );

    this.ccompiled.set('image.source._method', sourceMethod);

    workflow.unshiftStep(
        'image/source/canonicalize',
        function (workflow, callback1) {
            this.getImageSource().recompileCanonicalize(
                function (error, result) {
                    if (result) {
                        this.ccompiled.set('image.source', result);
                        this.imageSource = null;
                    }

                    callback1(error, true);
                }.bind(this)
            );
        }
    )

    callback();
}

// --

Profile.prototype.getContainerNames = function () {
    if (null === this.names) {
        this.names = new Config(this.ccompiled.get('container.name'));
    }

    return this.names;
}

Profile.prototype.getImageCache = function () {
    if (null === this.imageCache) {
        var mtype = require('../image/cache/' + this.ccompiled.get('image.cache._method'));

        this.imageCache = new mtype(
            new Config(this.ccompiled.get('image.cache')),
            this.logger
        );
    }

    return this.imageCache;
}

Profile.prototype.getImageConfig = function () {
    if (null === this.imageConfig) {
        var mtype = require('../image/config/' + this.ccompiled.get('image.config._method'));

        this.imageConfig = new mtype(
            new Config(this.ccompiled.get('image')),
            this.logger
        );
    }

    return this.imageConfig;
}

Profile.prototype.getImageEngine = function () {
    if (null === this.imageEngine) {
        var mtype = require('../image/engine/' + this.ccompiled.get('image.engine._method'));

        this.imageEngine = new mtype(
            new Config(this.ccompiled.get('image')),
            this.logger
        );
    }

    return this.imageEngine;
}

Profile.prototype.getImageSource = function () {
    if (null === this.imageSource) {
        var mtype = require('../image/source/' + this.ccompiled.get('image.source._method'));

        this.imageSource = new mtype(
            new Config(this.ccompiled.get('image.source')),
            this.logger
        );
    }

    return this.imageSource;
}

// --

module.exports = Profile;
