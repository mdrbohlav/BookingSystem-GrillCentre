var phantom = require('phantom'),
    jade = require('jade');

var RenderingPdfError = require('../errors/RenderingPdfError');

var session;

exports.renderPdf = function(_session, req, next, cb) {
    var page;

    console.log(_session);

    _session.createPage().then(function(_page) {
        page = _page;
        page.setting('loadImages', true);
        page.setting('localToRemoteUrlAccessEnabled', true);
        page.setting('loadPlugins', false);
        page.property('viewportSize', {
            width: 800,
            height: 600
        });
        page.property('paperSize', {
            format: 'A4',
            orientation: 'portrait',
            border: '1.5cm'
        });

        page.property('onResourceRequested', function(rd, req) {
            console.log("pdf requested: ", rd[0]["url"]);
        });
        page.property('onResourceReceived', function(rd) {
            rd.stage == "end" && console.log("pdf loaded: ", rd["url"]);
        });
        page.property('onLoadFinished', function(a) {
            console.log(a);
        });

        var style = req.protocol + '://' + req.get('host') + '/css/style.css';

        var html = jade.renderFile('public/templates/pdf-template.jade', {
            user: req.user,
            style: style
        });

        page.property('content', html).then(function(err) {
            if (err) {
                return next(new RenderingPdfError("Error while opening the template!"));
            }

            var nowMs = new Date().getTime(),
                fileName = req.user.id + '-' + nowMs + '.pdf',
                filePath = 'public/others/';
                wholePath = filePath + fileName;
            page.render(wholePath).then(function(created) {
                if (!created) {
                    return next(new RenderingPdfError("Error while rendering the file!"));
                }

                page.close();
                page = null;
                return cb(filePath, fileName);
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
        return next(new RenderingPdfError(e.toString()));
    });
};

exports.createPhantomSession = function(cb) {
    if (session) {
        return cb(session);
    } else {
        phantom.create(['--ignore-ssl-errors=yes']).then(function(_session) {
            session = _session;
            return cb(session);
        });
    }
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
