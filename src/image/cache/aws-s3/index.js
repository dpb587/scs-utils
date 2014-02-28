var fs = require('fs');

var AWS = require('aws-sdk');

// --

function Cache(cruntime, logger) {
    this.cruntime = cruntime;
    this.logger = logger;

    this.apiClient = null;
}

Cache.prototype.getApiClient = function () {
    if (null === this.apiClient) {
        this.apiClient = new AWS.S3(
            {
                region: this.cruntime.get('api.region', null),
                accessKeyId: this.cruntime.get('api.access_key_id', null),
                secretAccessKey: this.cruntime.get('api.secret_access_key', null),
                sessionToken: this.cruntime.get('api.session_token', null)

            }
        );
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

Cache.prototype.get = function (key, tmppath, callback) {
    var bucket = this.cruntime.get('bucket');
    var s3key = this.cruntime.get('prefix') + key;
    var fh = fs.createWriteStream(tmppath);

    this.logger.silly(
        'image/cache/aws-s3',
        'getting "s3://' + bucket + '/' + s3key + '"'
    );

    var req = this.getApiClient().getObject(
        {
            Bucket : bucket,
            Key : s3key
        },
        function (error, data) {
            if (error) {
                callback(error);

                return;
            }

            callback();
        }
    );

    req.on(
        'httpData',
        function (chunk) {
            fh.write(chunk);
        }
    );

    req.on(
        'httpDone',
        function() {
            fh.end();

            callback();
        }
    );
}

Cache.prototype.put = function (key, tmppath, callback) {
    var bucket = this.cruntime.get('bucket');
    var s3key = this.cruntime.get('prefix') + key;
    var fh = fs.createReadStream(tmppath);
    var fstat = fs.statSync(tmppath);

    this.logger.silly(
        'image/cache/aws-s3',
        'putting "s3://' + bucket + '/' + s3key + '"'
    );

    this.getApiClient().putObject(
        {
            ACL : this.cruntime.get('acl'),
            Body : fh,
            Bucket : bucket,
            ContentLength : fstat.size,
            Key : s3key
        },
        function (error, data) {
            if (error) {
                callback(error);

                return;
            }

            callback();
        }
    )
}

// --

module.exports = Cache;
