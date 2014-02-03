module.exports = [
    {
        url : '/session/',
        method : 'GET',
        handle : function (context, request, response, params) {
            var result = {
                index : []
            };

            Object.keys(context.registry.sessions).forEach(
                function (id) {
                    data.index.push(
                        {
                            url : '/session/' + id + '/'
                        }
                    );
                }
            );

            return data;
        }
    }
];
