var r = [];
r.push.apply(r, require('./root'));
r.push.apply(r, require('./discovery'));
r.push.apply(r, require('./session'));
r.push.apply(r, require('./disco-http'));
r.push.apply(r, require('./disco-registry'));

module.exports = r;
