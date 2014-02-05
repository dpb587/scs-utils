var fs = require('fs');
var path = require('path');

describe('meta', function () {
    describe('require', function () {
        it('can require all source files', function () {
            function loaddir(dir) {
                fs.readdir(
                    dir,
                    function (err, files) {
                        if (err) {
                            throw err;
                        }

                        files.map(
                            function (file) {
                                return path.join(dir, file);
                            }
                        ).forEach(
                            function (file) {
                                var stat = fs.statSync(file);

                                if (stat.isFile() && ('.js' == path.extname(file))) {
                                    require(file);
                                } else if (stat.isDirectory()) {
                                    loaddir(file);
                                }
                            }
                        );
                    }
                );
            }

            loaddir(path.join(__dirname, '/../../src'));
        });
    });
});
