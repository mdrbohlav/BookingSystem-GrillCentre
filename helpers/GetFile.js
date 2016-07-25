// # Načtení souboru
var fs = require('fs');

// ## Export GetFileHelperu
module.exports = function(filename) {
    var data = fs.readFileSync(filename, {
        encoding: 'utf8'
    });
    return data;
};
