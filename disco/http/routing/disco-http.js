module.exports = [
    {
        method : 'GET',
        url : '/disco/http/routes',
        handle : function (context, request, response, params) {
            var result = [];

            context.http.routes.forEach(
                function (route) {
                    result.push(
                        {
                            path : route.url
                        }
                    );
                }
            );

            return result;
        }
    }
];
