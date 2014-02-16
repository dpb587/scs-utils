var crypto = require('crypto');

var Config = require('./config');
var Workflow = require('./workflow');

// --

function Profile (cruntime, ccompiled, logger) {
    this.cruntime = cruntime;
    this.ccompiled = ccompiled;
    this.logger = logger;

    this.names = null;
    this.imageEngine = null;
    this.imageSource = null;
    this.imageRuntimeProvide = {};
    this.imageRuntimeRequire = {};
    this.imageRuntimeVolume = {};
}

// --

Profile.prototype.recompile = function (callback) {
    this.ccompiled = new Config();

    var workflow = new Workflow(this, this.logger, 'recompile');
    workflow.pushStep('image/source', recompileImageSource);
    workflow.pushStep('image/cache', recompileImageCache);
    workflow.pushStep('image', recompileImageManifest);
    workflow.pushStep('image/id', recompileImageUid);
    workflow.pushStep('container', recompileContainer);
    workflow.pushStep('compiled/id', recompileCompiledUid);
    workflow.run(callback);
};

function recompileImageUid (workflow, callback) {
    var hash, data;

    this.ccompiled.set('image.id.uid', null);

    var uidhash = crypto.createHash('sha1');

    hash = crypto.createHash('sha1');
    data = this.ccompiled.getFlattenedPairs('image.config', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('config: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.ccompiled.getFlattenedPairs('image.engine', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('engine: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.ccompiled.getFlattenedPairs('image.runtime', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('runtime: ' + hash.digest('hex') + '\n');

    hash = crypto.createHash('sha1');
    data = this.ccompiled.getFlattenedPairs('image.source', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('source: ' + hash.digest('hex') + '\n');

    this.ccompiled.set('image.id.uid', uidhash.digest('hex'));

    callback();
};

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
    data = this.cruntime.getFlattenedPairs('image.runtime', {})
    data.sort();
    hash.update(data.join('\n'));
    uidhash.update('runtime: ' + hash.digest('hex') + '\n');

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

function recompileImageCache (workflow, callback) {
    this.ccompiled.set('image.cache', null);

    if (!this.cruntime.has('image.cache.method')) {
        throw new Error('Runtime configuration is missing image.cache.method');
    }

    var cacheMethod = this.cruntime.get('image.cache.method');

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
                        cimage.get('config.options', {}),
                        this.cruntime.get('image.config', {})
                    ]
                )
            );

            this.ccompiled.set('image.config._method', configMethod);


            this.ccompiled.set('image.runtime.provide', null);

            var provideMap = cimage.get('runtime.provide', {});

            Object.keys(provideMap).forEach(
                function (key) {
                    this.ccompiled.set(
                        'image.runtime.provide.' + key,
                        require('../image/runtime/provide/compiler').compileImageConfig(
                            key,
                            [ provideMap[key] ]
                        )
                    );
                }.bind(this)
            );


            this.ccompiled.set('image.runtime.require', null);

            var requireMap = cimage.get('runtime.require', {});

            Object.keys(requireMap).forEach(
                function (key) {
                    this.ccompiled.set(
                        'image.runtime.require.' + key,
                        require('../image/runtime/require/compiler').compileImageConfig(
                            key,
                            [ requireMap[key] ]
                        )
                    );
                }.bind(this)
            );


            this.ccompiled.set('image.runtime.volume', null);

            var volumeMap = cimage.get('runtime.volume', {});

            Object.keys(volumeMap).forEach(
                function (key) {
                    this.ccompiled.set(
                        'image.runtime.volume.' + key,
                        require('../image/runtime/volume/compiler').compileImageConfig(
                            key,
                            [ volumeMap[key] ]
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

    if (!this.cruntime.has('container.name.environment')) {
        throw new Error('Runtime configuration is missing name.environment');
    } else if (!this.cruntime.has('container.name.service')) {
        throw new Error('Runtime configuration is missing name.service');
    } else if (!this.cruntime.has('container.name.role')) {
        throw new Error('Runtime configuration is missing name.role');
    }
    
    this.ccompiled.set('container.name.environment', this.cruntime.get('container.name.environment'));
    this.ccompiled.set('container.name.service', this.cruntime.get('container.name.service'));
    this.ccompiled.set('container.name.role', this.cruntime.get('container.name.role'));


    this.ccompiled.set('container.runtime.provide', null);

    var provideMap = this.cruntime.get('container.runtime.provide', {});

    Object.keys(provideMap).forEach(
        function (key) {
            this.ccompiled.set(
                'container.runtime.provide.' + key,
                require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container/provide/' + provideMap[key].method + '/compiler').compileContainerConfig(
                    this.getContainerNames(),
                    key,
                    [ 'options' in provideMap[key] ? provideMap[key].options : {} ]
                )
            );

            this.ccompiled.set('container.runtime.provide.' + key + '.method', null);
            this.ccompiled.set('container.runtime.provide.' + key + '._method', provideMap[key].method);
        }.bind(this)
    );


    this.ccompiled.set('container.runtime.require', null);

    var requireMap = this.cruntime.get('container.runtime.require', {});

    Object.keys(requireMap).forEach(
        function (key) {
            this.ccompiled.set(
                'container.runtime.require.' + key,
                require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container/require/' + provideMap[key].method + '/compiler').compileContainerConfig(
                    this.getContainerNames(),
                    key,
                    [ 'options' in requireMap[key] ? requireMap[key].options : {} ]
                )
            );

            this.ccompiled.set('container.runtime.require.' + key + '.method', null);
            this.ccompiled.set('container.runtime.require.' + key + '._method', requireMap[key].method);
        }.bind(this)
    );


    this.ccompiled.set('container.runtime.volume', null);

    var volumeMap = this.cruntime.get('container.runtime.volume', {});

    Object.keys(volumeMap).forEach(
        function (key) {
            this.ccompiled.set(
                'container.runtime.volume.' + key,
                require('../image/engine/' + this.ccompiled.get('image.engine._method') + '/container/volume/' + volumeMap[key].method + '/compiler').compileContainerConfig(
                    this.getContainerNames(),
                    key,
                    [ 'options' in volumeMap[key] ? volumeMap[key].options : {} ]
                )
            );

            this.ccompiled.set('container.runtime.volume.' + key + '.method', null);
            this.ccompiled.set('container.runtime.volume.' + key + '._method', volumeMap[key].method);
        }.bind(this)
    );

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
        require('../image/source/' + sourceMethod + '/compiler').compileRuntimeConfig(
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

Profile.prototype.getImageEngine = function () {
    if (null === this.imageEngine) {
        var mtype = require('../image/engine/' + this.ccompiled.get('image.engine._method'));

        this.imageEngine = new mtype(
            new Config(this.ccompiled.get('image.engine')),
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

Profile.prototype.getRuntimeProvide = function (key) {
    if (null === this.imageSource) {
        var mtype = require('../image/source/' + this.ccompiled.get('image.source._method'));

        this.imageSource = new mtype(
            new Config(this.ccompiled.get('image.source')),
            this.logger
        );
    }

    return this.imageSource;
}

module.exports = Profile;
