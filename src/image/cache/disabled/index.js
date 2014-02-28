function Cache(cruntime, logger) {
    this.cruntime = cruntime;
    this.logger = logger;
}

Cache.prototype.isAvailable = function () {
    return false;
}

Cache.prototype.has = function (key, callback) {
    throw new Error('The disabled cache is not available.');
}

Cache.prototype.get = function (key, fh, callback) {
    throw new Error('The disabled cache is not available.');
}

Cache.prototype.put = function (key, fh, callback) {
    throw new Error('The disabled cache is not available.');
}

// --

module.exports = Cache;
