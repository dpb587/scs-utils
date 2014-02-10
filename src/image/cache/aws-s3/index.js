var AWS = require('aws-sdk');

// --

function Cache(profile, config, logger) {
    this.profile = profile;
    this.config = config;
    this.logger = logger;

    this.config.log(this.logger, 'silly', 'image/cache/aws-s3/config');

    this.apiClient = null;
}

Cache.prototype.getApiClient = function () {
    if (null === this.apiClient) {
        this.apiClient = new AWS.S3();
    }

    return this.apiClient;
}

Cache.prototype.isAvailable = function () {
    return true;
}

Cache.prototype.has = function (callback) {
    var bucket = this.config.get('bucket');
    var key = this.config.get('prefix') + this.profile.compconf.get('ident.image');

    this.logger.silly(
        'image/cache/aws-s3',
        'checking "s3://' + bucket + '/' + key + '"'
    );

    this.getApiClient().headObject(
        {
            Bucket : bucket,
            Key : key
        },
        function (error, result) {
            if (error) {
                if ('NotFound' == error.name) {
                    callback(null, false);
                } else {
                    callback(error);
                }

                return;
            }

            callback(null, true);
        }
    );
}

Cache.prototype.get = function (fp, callback) {
    throw new Error('The disabled cache is not available.');
}

Cache.prototype.put = function (fp, callback) {
    throw new Error('The disabled cache is not available.');
}

// --

module.exports = Cache;
