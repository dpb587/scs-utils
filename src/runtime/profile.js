var crypto = require('crypto');
var fs = require('fs');
var os = require('os');
var util = require('util');
var Config = require('../config/config');
var ImageConfig = require('../config/image');
var Workflow = require('./workflow');

// --

function Profile(coreconf, runconf, compconf, logger) {
    var that = this;

    this.coreconf = coreconf;
    this.runconf = runconf;
    this.compconf = compconf;
    this.logger = logger;

    this.replaceImageManifest(
        function (config) {
            config.importObject(that.compconf.get('imageconf', {}));
        }
    );

    this.imageSource = null;
    this.imageConfigurator = null;
    this.imageEngine = null;
    this.imageCache = null;
}

Profile.prototype.replaceImageManifest = function (callback) {
    var imageconf = new ImageConfig();

    callback(imageconf);
    imageconf.log(this.logger, 'silly', 'process/imageconf');

    this.imageconf = imageconf;
    this.compconf.unset('imageconf');
    this.compconf.set('imageconf', this.imageconf.config);
}

Profile.prototype.getImageCache = function () {
    if (null === this.imageCache) {
        var imageCacheType = this.runconf.get('image.cache.method', this.coreconf.get('image.cache._default_'));

        var imageCacheConfig = new (require('../image/cache/' + imageCacheType + '/config'));
        imageCacheConfig.importObject(this.runconf.get('image.cache.options', {}));

        this.imageCache = new (require('../image/cache/' + imageCacheType))(
            this,
            imageCacheConfig,
            this.logger
        );
    }

    return this.imageCache;
}

Profile.prototype.getImageEngine = function () {
    if (null === this.imageEngine) {
        var imageEngineType = this.runconf.get('image.engine.method', this.coreconf.get('image.engine._default_'));

        var imageEngineConfig = new (require('../image/engine/' + imageEngineType + '/config'));
        imageEngineConfig.importObject(this.compconf.get('image.engine.' + imageEngineType, {}));
        imageEngineConfig.importObject(this.runconf.get('image.engine.options', {}));

        this.imageEngine = new (require('../image/engine/' + imageEngineType))(
            this,
            imageEngineConfig,
            this.logger
        );
    }

    return this.imageEngine;
}

Profile.prototype.getImageConfigurator = function () {
    if (null === this.imageConfigurator) {
        var imageConfiguratorType = this.imageconf.get('configurator.method', this.coreconf.get('image.configurator._default_', null));

        var imageConfiguratorConfig = new (require('../image/configurator/' + imageConfiguratorType + '/config'));
        imageConfiguratorConfig.importObject(this.compconf.get('image.configurator.defaults', {}));
        imageConfiguratorConfig.importObject(this.runconf.get('image.config', {}));

        this.imageConfigurator = new (require('../image/configurator/' + imageConfiguratorType))(
            this,
            imageConfiguratorConfig,
            this.logger
        );
    }

    return this.imageConfigurator;
}

Profile.prototype.getImageSource = function () {
    if (null === this.imageSource) {
        var imageSourceType = this.runconf.get('image.source.method', this.coreconf.get('image.source._default_'));

        var imageSourceConfig = new (require('../image/source/' + imageSourceType + '/config'));
        imageSourceConfig.importObject(this.runconf.get('image.source.options', {}));

        this.imageSource = new (require('../image/source/' + imageSourceType))(
            this,
            imageSourceConfig,
            this.logger
        );
    }

    return this.imageSource;
}

function updateSourceReferenceStep (workflow, callback) {
    var that = this;

    this.getImageSource().resolveReference(
        function (error, result) {
            if (error) {
                callback(error);

                return;
            }

            that.compconf.set('source.reference_canonical', result);

            callback(null, true);
        }
    );
};

function updateIdentsStep (workflow, callback) {
    this.compconf.set(
        'ident.common',
        util.format(
            '%s-%s-%s',
            this.runconf.get('name.environment'),
            this.runconf.get('name.service'),
            this.runconf.get('name.role')
        )
    );

    this.compconf.set(
        'ident.local',
        this.runconf.get(
            'name.local',
            this.compconf.get('ident.common')
        )
    );

    var hash = crypto.createHash('sha1');
    hash.update([
        'name.environment=' + this.runconf.get('name.environment'),
        'name.service=' + this.runconf.get('name.service'),
        'name.role=' + this.runconf.get('name.role')
    ].join('\n'));
    hash.update('\n--\n');
    hash.update([
        'source.type=' + this.runconf.get('source.type'),
        'source.uri=' + this.runconf.get('source.uri'),
        'source.reference=' + this.compconf.get('source.reference')
    ].join('\n'));
    hash.update('\n--\n');
    hash.update(this.runconf.getFlattenedPairs('image.config').join('\n'));

    this.compconf.set(
        'ident.image',
        util.format(
            '%s-%s',
            this.compconf.get('ident.common'),
            hash.digest('hex').substring(0, 10)
        )
    );

    this.compconf.set(
        'ident.tmppath',
        os.tmpdir() + '/scs-' + this.compconf.get('ident.local')
    );

    callback(null, true);
}

function loadImageManifestStep (workflow, callback) {
    var that = this;

    this.replaceImageManifest(
        function (config) {
            config.importFile(that.compconf.get('ident.tmppath') + '/scs/image.yaml');
        }
    );

    callback(null, true);
}

Profile.prototype.createGatheringWorkflow = function () {
    var workflow = new Workflow(this, 'workflow/gather-basics');

    workflow.pushStep(
        'resolving source reference',
        updateSourceReferenceStep.bind(this)
    );

    workflow.pushStep(
        'updating idents',
        updateIdentsStep.bind(this)
    );

    var source = this.getImageSource();

    workflow.pushStep(
        'creating local working directory',
        source.createWorkingDirectoryStep.bind(source)
    );

    workflow.pushStep(
        'loading image manifest',
        loadImageManifestStep.bind(this)
    );

    return workflow;
}

function compileImageConfigurationStep (workflow, callback) {
    this.getImageConfigurator().appendCompilationSteps(workflow);
    this.getImageEngine().appendCompilationSteps(workflow);
    
    callback(null, true);
}

Profile.prototype.createImageBuildingWorkflow = function () {
    var workflow = new Workflow(this, 'workflow/image-building');

    workflow.pushStep(
        'preparing image compilation',
        compileImageConfigurationStep.bind(this)
    );

    return workflow;
}

// --

module.exports = Profile;
