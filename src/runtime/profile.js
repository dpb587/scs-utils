var crypto = require('crypto');
var fs = require('fs');
var os = require('os');
var util = require('util');
var Config = require('../config/config');
var ImageConfig = require('../config/image');
var Workflow = require('./workflow');
var Container = require('./container');

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

    this.containerNetwork = null;
    this.containerVolume = {};
    this.containerProvision = {};
    this.containerRequirement = {};
}

Profile.prototype.replaceImageManifest = function (callback) {
    var imageconf = new ImageConfig();

    callback(imageconf);
    imageconf.log(this.logger, 'silly', 'process/imageconf');

    this.imageconf = imageconf;
    this.compconf.unset('imageconf');

    if (0 < Object.keys(this.imageconf.config).length) {
        this.compconf.set('imageconf', this.imageconf.config);
    } else {
        this.compconf.set('imageconf', null);
    }
}

Profile.prototype.getContainerNetwork = function () {
    if (null === this.containerNetwork) {
        var runtimeNetworkType = this.runconf.get('runtime.network.method', this.coreconf.get('runtime.network._default_'));

        var runtimeNetworkConfig = new (require('../image/engine/' + this.getImageEngineType() + '/runtime/network/' + runtimeNetworkType + '/config'));
        runtimeNetworkConfig.importObject(this.runconf.get('runtime.network.options', {}));

        this.containerNetwork = new (require('../image/engine/' + this.getImageEngineType() + '/runtime/network/' + runtimeNetworkType))(
            this,
            runtimeNetworkConfig,
            this.logger
        );
    }

    return this.containerNetwork;
}

Profile.prototype.getContainerVolume = function (key) {
    if (!(key in this.containerVolume)) {
        var runtimeVolumeType = this.runconf.get('runtime.volume.' + key + '.method', this.coreconf.get('runtime.volume._default_', null));

        var runtimeVolumeConfig = new (require('../image/engine/' + this.getImageEngineType() + '/runtime/volume/' + runtimeVolumeType + '/config'));
        runtimeVolumeConfig.importObject(this.runconf.get('runtime.volume.' + key + '.options', {}));

        this.containerVolume[key] = new (require('../image/engine/' + this.getImageEngineType() + '/runtime/volume/' + runtimeVolumeType))(
            this,
            key,
            runtimeVolumeConfig,
            this.logger
        );
    }

    return this.containerVolume[key];
}

Profile.prototype.getContainerProvision = function (key) {
    if (!(key in this.containerProvision)) {
        var runtimeProvisionType = this.runconf.get('runtime.provide.' + key + '.method', this.coreconf.get('runtime.provide._default_', null));

        var runtimeProvisionConfig = new (require('../image/engine/' + this.getImageEngineType() + '/runtime/provide/' + runtimeProvisionType + '/config'));
        runtimeProvisionConfig.importObject(this.runconf.get('runtime.provide.' + key + '.options', {}));

        this.containerProvision[key] = new (require('../image/engine/' + this.getImageEngineType() + '/runtime/provide/' + runtimeProvisionType))(
            this,
            key,
            runtimeProvisionConfig,
            this.logger
        );
    }

    return this.containerProvision[key];
}

Profile.prototype.getContainerRequirement = function (key) {
    if (!(key in this.containerRequirement)) {
        var runtimeRequirementType = this.runconf.get('runtime.require.' + key + '.method', this.coreconf.get('runtime.require._default_', null));

        var runtimeRequirementConfig = new (require('../image/engine/' + this.getImageEngineType() + '/runtime/require/' + runtimeRequirementType + '/config'));
        runtimeRequirementConfig.importObject(this.runconf.get('runtime.require.' + key + '.options', {}));

        this.containerRequirement[key] = new (require('../image/engine/' + this.getImageEngineType() + '/runtime/require/' + runtimeRequirementType))(
            this,
            key,
            runtimeRequirementConfig,
            this.logger
        );
    }

    return this.containerRequirement[key];
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

Profile.prototype.getImageEngineType = function () {
    return this.runconf.get('image.engine.method', this.coreconf.get('image.engine._default_'));
}

Profile.prototype.getImageEngine = function () {
    if (null === this.imageEngine) {
        var imageEngineType = this.getImageEngineType();

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
        'source.reference_canonical=' + this.compconf.get('source.reference_canonical')
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
    var workflow = new Workflow(this, this.logger, 'gather-basics');

    workflow.pushStep(
        'resolving source reference',
        updateSourceReferenceStep
    );

    workflow.pushStep(
        'updating idents',
        updateIdentsStep
    );

    var source = this.getImageSource();

    workflow.pushStep(
        'creating local working directory',
        source.createWorkingDirectoryStep.bind(source)
    );

    workflow.pushStep(
        'loading image manifest',
        loadImageManifestStep
    );

    return workflow;
}

function compileImageConfigurationStep (workflow, callback) {
    this.getImageConfigurator().appendCompilationSteps(workflow);
    this.getImageEngine().appendCompilationSteps(workflow);
    
    callback(null, true);
}

function buildImageStep (workflow, callback) {
    this.getImageEngine().build(workflow, callback);
}

Profile.prototype.createImageBuildingWorkflow = function () {
    var that = this;
    var workflow = new Workflow(this, this.logger, 'image-building');

    workflow.pushStep(
        'updating local',
        function (workflow, callback) {
            that.createGatheringWorkflow().run(callback);
        }
    );

    workflow.pushStep(
        'preparing image compilation',
        compileImageConfigurationStep
    );

    var engine = this.getImageEngine();

    workflow.pushStep(
        'building image',
        engine.build.bind(engine)
    );

    return workflow;
}

Profile.prototype.startContainer = function (callback) {
    var container = new Container(this, this.logger);

    container.start(
        function (error, result) {
            console.log('startContainer callback');

            if (error) {
                callback(error);

                return;
            }

            callback(null, container);
        }
    );
}

// --

module.exports = Profile;
