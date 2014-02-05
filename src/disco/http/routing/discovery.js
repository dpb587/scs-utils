function simpleDirectory(url) {
    return {
        url : url,
        method : 'GET',
        handle : function (context, request, response, params) {
            var unique = {};
            var result = {
                index : []
            };

            var re = new RegExp('^' + request.url.substring(11) + '([^/]+)/');

            Object.keys(context.registry.discoveryMap).forEach(
                function (key) {
                    var m;

                    if (null === (m = re.exec(key))) {
                        return;
                    } else if (m[1] in unique) {
                        return;
                    }

                    result.index.push(
                        {
                            url : request.url + m[1] + '/'
                        }
                    );
                }
            );

            return result;
        }
    };
}

module.exports = [
    simpleDirectory('/discovery/'),
    simpleDirectory('/discovery/{environment}/'),
    simpleDirectory('/discovery/{environment}/{service}/'),
    simpleDirectory('/discovery/{environment}/{service}/{role}/')
];
