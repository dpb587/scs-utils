var DiscoTcpClient = require('../../../../../../disco/service/tcp/client/service');

// --

function Dependency () {
    this.discoId = null;
}

// --

Dependency.prototype.getDiscoClient = function (container) {
    var that = this;

    return container.retrieve(
        'disco_' + this.ccontainer.get('server.address') + '_' + this.ccontainer.get('server.port'),
        function () {
            var disco = new DiscoTcpClient(
                {
                    server : that.ccontainer.get('server')
                },
                that.logger
            );

            disco.start();

            return disco;
        }
    );
}

module.exports = Dependency;
