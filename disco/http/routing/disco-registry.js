module.exports = [
    {
        method : 'GET',
        url : '/disco/registry/dump/discovery-map',
        handle : function (context, request, response, params) {
            return context.registry.discoveryMap;
        }
    },
    {
        method : 'GET',
        url : '/disco/registry/dump/provision-handles',
        handle : function (context, request, response, params) {
            return context.registry.provisionHandles;
        }
    },
    {
        method : 'GET',
        url : '/disco/registry/dump/requirement-handles',
        handle : function (context, request, response, params) {
            return context.registry.requirementHandles;
        }
    }
];
