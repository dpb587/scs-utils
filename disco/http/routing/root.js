module.exports = [
    {
        url : '/',
        method : 'GET',
        handle : function (context, request, response, params) {
            return {
                'index' : [
                    { url : '/session/' },
                    { url : '/discovery/' },
                    { url : '/handle/' },
                    { url : '/disco/' }
                ]
            };
        }
    }
];
