function Cache(profile, options, logger) {
    this.profile = profile;
    this.options = options;
    this.logger = logger;
}

Cache.prototype.isAvailable = function () {
    return false;
}

Cache.prototype.has = function (callback) {
    throw new Error('The disabled cache is not available.');
}

Cache.prototype.get = function (fp, callback) {
    throw new Error('The disabled cache is not available.');
}

Cache.prototype.put = function (fp, callback) {
    throw new Error('The disabled cache is not available.');
}

// --

module.exports = Cache;
