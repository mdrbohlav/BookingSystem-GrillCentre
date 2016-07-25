// # Helper na generování PDF
var phantom = require('phantom'),
    jade = require('jade'),
    marked = require('marked');

// [Helper pro načtení souboru](../helpers/GetFile.html)
var GetFile = require(__dirname + '/../helpers/GetFile');

var RenderingPdfError = require(__dirname + '/../errors/RenderingPdfError');

// Proměnná pro phantom session.
var session,
    // Předkompilovaná šablona.
    jadeTemplate = jade.compileFile('public/templates/pdf-template.jade');

// ## Renderování PDF
function renderPdf(_session, req, user) {
    return new Promise(function(resolve, reject) {
        var page;

        // ### Inicializace stránky
        _session.createPage().then(function(_page) {
            // Načtení konfiguračního souboru.
            var configCustom = JSON.parse(GetFile('./config/app.json')).custom;

            // Nastavení proporcí stránce.
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
                rd.stage = "end" && console.log("pdf loaded: ", rd["url"]);
            });

            // Získání souboru se stylama.
            var style = req.protocol + '://' + req.get('host') + '/css/style.css';

            // Načtení správné lokalizace smlouvy.
            var text = Object.keys(user.locale)[0] === 'cs' ? configCustom.PDF_CS : configCustom.PDF_EN,
                // Nahrazení všech proměnných, pokud jsou nastaveny, jinak vykreslit tečky pro ruční
                // doplnění.
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

            // Nastavení obsahu do šablony a vrácení HTML.
            var html = jadeTemplate({
                text: marked(text),
                style: style
            });

            // Nastavení obsahu stránky.
            page.property('content', html).then(function(err) {
                // Pokud nastala chyba, vrátit `RenderingPdfError`.
                if (err) {
                    reject(new RenderingPdfError("Error while opening the pdf template!"));
                }

                // Vygenerování názvu souboru.
                var nowMs = new Date().getTime(),
                    fileName = user.id + '-' + nowMs + '.pdf',
                    filePath = 'public/others/';
                wholePath = filePath + fileName;

                // Vyrenderování samotného PDF.
                page.render(wholePath).then(function(created) {
                    // Pokud nebyl soubor vytvořen, vrátit chybu `RenderingPdfError`.
                    if (!created) {
                        reject(new RenderingPdfError("Error while rendering the .pdf file!"));
                    }

                    // Uzavřít stránku.
                    page.close();
                    page = null;

                    // Vrátit cestu k souboru.
                    resolve(wholePath);
                });
            });
        }).catch(function(e) {
            try {
                if (page !== null) {
                    // Pokusí se zavřít stránku, pokud je otevřena le nikdy nebylo vyrenderováno
                    // PDF kvůli chybě.
                    page.close();
                }
            } catch (e) {
                // Ignpruje, stránka nemusela být inicializována.
            }
            // Vrácení chyby `RenderingPdfError`.
            reject(new RenderingPdfError(e.toString()));
        });
    });
}

// ## Vytvoření phantom session
function createPhantomSession() {
    return new Promise(function(resolve, reject) {
        // Pokud existuje, vrátit ji.
        if (session) {
            resolve(session);
        // Jinak vytvořit novou.
        } else {
            phantom.create(['--ignore-ssl-errors=yes']).then(function(_session) {
                session = _session;
                resolve(session);
            });
        }
    });
}

// ## Handler při ukončení
// Pro uvolnění phantom session při ukončení běhu aplikace.
function exitHandler(options, err) {
    if (session) {
        session.exit();
    }

    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

// Pokud se aplikace ukončuje.
process.on('exit', exitHandler.bind(null, { cleanup: true }));

// Při ctrl+c.
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// Neodchyvené výjimky.
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

// ## Objekt helperu
var PdfHelper = function() {
    var helper = {};

    // ### Funkce na získání PDF
    helper.getFile = function(req, user) {
        return new Promise(function(resolve, reject) {
            // Kontrola session.
            createPhantomSession().then(function(session) {
                // Zavolání vyrenderování PDF.
                renderPdf(session, req, user).then(function(wholePath) {
                    // Vrácení informace o úspěchu s cestou k souboru.
                    resolve({
                        success: true,
                        file: wholePath
                    });
                }).catch(function(err) {
                    reject(err);
                });
            });
        });
    };

    return helper;
};

// ## Export PdfHelperu
module.exports = PdfHelper;
