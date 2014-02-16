function Cache(cruntime, logger) {
    this.cruntime = cruntime;
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
