var AWS = require('aws-sdk');

// --

function Cache(cruntime, logger) {
    this.cruntime = cruntime;
    this.logger = logger;

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

Cache.prototype.has = function (key, callback) {
    var bucket = this.cruntime.get('bucket');
    var s3key = this.cruntime.get('prefix') + key;

    this.logger.silly(
        'image/cache/aws-s3',
        'checking "s3://' + bucket + '/' + s3key + '"'
    );

    this.getApiClient().headObject(
        {
            Bucket : bucket,
            Key : s3key
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
