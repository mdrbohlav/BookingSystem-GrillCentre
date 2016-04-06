var phantom = require('phantom'),
    jade = require('jade'),
    marked = require('marked');

var GetFile = require(__dirname + '/../helpers/GetFile');

var RenderingPdfError = require(__dirname + '/../errors/RenderingPdfError');

var session,
    jadeTemplate = jade.compileFile('public/templates/pdf-template.jade');

function renderPdf(_session, req, user) {
    return new Promise(function(resolve, reject) {
        var page;

        _session.createPage().then(function(_page) {
            var configCustom = JSON.parse(GetFile('./config/app.json')).custom;

            page = _page;
            page.setting('loadImages', true);
            page.setting('localToRemoteUrlAccessEnabled', true);
            page.setting('loadPlugins', false);
            page.property('paperSize', {
                format: 'A4',
                orientation: 'portrait',
                margin: {
                    bottom: '1.5cm',
                    top: '1.5cm',
                    left: '2cm',
                    right: '2cm'
                }
            });

            page.property('onResourceRequested', function(rd, req) {
                console.log("pdf requested: ", rd[0]["url"]);
            });
            page.property('onResourceReceived', function(rd) {
                rd.stage == "end" && console.log("pdf loaded: ", rd["url"]);
            });

            var style = req.protocol + '://' + req.get('host') + '/css/style.css';

            var text = Object.keys(user.locale)[0] === 'cs' ? configCustom.PDF_CS : configCustom.PDF_EN,
                lastname = user.lastname ? user.lastname : '..........................................',
                room = user.room ? user.room : '............',
                block = user.block ? user.block : '............',
                isId = user.isId ? user.isId : '........................',
                phone = user.phone ? user.phone.replace(/^00/, '+') : '....................................';

            text = text.replace(/(\*jmeno\*|\*name\*)/, user.firstname);
            text = text.replace(/(\*prijmeni\*|\*surname\*)/, lastname);
            text = text.replace(/\*email\*/, user.email);
            text = text.replace(/(\*pokoj\*|\*room\*)/, room);
            text = text.replace(/(\*blok\*|\*block\*)/, block);
            text = text.replace(/\*uid\*/, isId);
            text = text.replace(/(\*telefon\*|\*phone\*)/, phone);

            console.log (marked(text));

            var html = jadeTemplate({
                text: marked(text),
                style: style
            });

            page.property('content', html).then(function(err) {
                if (err) {
                    reject(new RenderingPdfError("Error while opening the pdf template!"));
                }

                var nowMs = new Date().getTime(),
                    fileName = user.id + '-' + nowMs + '.pdf',
                    filePath = 'public/others/';
                wholePath = filePath + fileName;

                page.render(wholePath).then(function(created) {
                    if (!created) {
                        reject(new RenderingPdfError("Error while rendering the .pdf file!"));
                    }

                    page.close();
                    page = null;
                    resolve(wholePath);
                });
            });
        }).catch(function(e) {
            try {
                if (page != null) {
                    page.close(); // try close the page in case it opened but never rendered a pdf due to other issues
                }
            } catch (e) {
                // ignore as page may not have been initialised
            }
            reject(new RenderingPdfError(e.toString()));
        });
    });
};

function createPhantomSession() {
    return new Promise(function(resolve, reject) {
        if (session) {
            resolve(session);
        } else {
            phantom.create(['--ignore-ssl-errors=yes']).then(function(_session) {
                session = _session;
                resolve(session);
            });
        }
    });
};

function exitHandler(options, err) {
    if (session) {
        session.exit();
    }

    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

var PdfHelper = function() {
    var helper = {};

    helper.getFile = function(req, user) {
        return new Promise(function(resolve, reject) {
            createPhantomSession().then(function(session) {
                renderPdf(session, req, user).then(function(wholePath) {
                    resolve({
                        success: true,
                        file: wholePath
                    });
                }).catch(function(err) {
                    reject(err);
                });
            });
        });
    }

    return helper;
};

module.exports = PdfHelper;
