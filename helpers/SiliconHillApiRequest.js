// # Helper na dotaz na SiliconHill API
var https = require('https'),
    config = require(__dirname + '/../config/global');

module.exports = function(url, access_token) {
    return new Promise(function(resolve, reject) {
        var headers = {
            Accept: 'application/json'
        };
        var req = https.request({
            host: config.OAUTH_API,
            path: url,
            method: 'GET',
            headers: headers
        }, function(response) {
            var data = '';

            response.on('data', function(chunk) {
                data += chunk;
            });

            response.on('end', function() {
                resolve(data, response);
            });
        });

        req.end();
    });
};
