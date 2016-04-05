var fs = require('fs');

module.exports = function(filename) {
    var data = fs.readFileSync(filename, {
        encoding: 'utf8'
    });
    return data;
};
