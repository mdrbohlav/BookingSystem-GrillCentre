// # Uživatel
var express = require('express'),
    router = express.Router();

// [Helper pro načtení souboru](../helpers/GetFile.html)
var GetFile = require(__dirname + '/../helpers/GetFile'),
    // [API pro uživatele](../api/user.html)
    User = require(__dirname + '/../api/user');

var InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError');

// ## Historie
// `GET /user/history`
router.get('/history', function(req, res, next) {
    // Načtení config souboru.
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom;

    // Nastavení řazení
    req.query.from = new Date();
    var to = new Date();
    to.setDate(to.getDate() + configCustom.MAX_RESERVATION_UPFRONT);
    req.query.to = to;
    var id = req.user.id,
        options = {
            order: [ 
                ['from', 'DESC'],
                ['to', 'DESC']
            ],
            limit: 20,
            offset: 0
        };

    // Příprava na stránkování
    if (req.query.limit) {
        options.limit = parseInt(req.query.limit);
    }
    if (req.query.offset) {
        options.offset = parseInt(req.query.offset);
    }

    // Dotaz na rezervace
    User.getReservations(id, options).then(function(result) {
        // Příprava proměnné na generování stránkování.
        result.pagination = {
            limit: options.limit,
            offset: options.offset
        };
        // Pokud chceme JSON, vrátit rezervace v JSONu.
        if (req.query.accept &&  req.query.accept === 'json') {
            res.json(result);
        // Jinak vykreslit šablonu.
        } else {
            res.render('history', {
                page: 'history',
                title: req.i18n.__('titles_1') + ' | ' + req.i18n.__('title'),
                description: req.i18n.__('description'),
                data: result
            });
        }
    }).catch(function(data) {
        console.log(data);
        if ('errors' in data) {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        } else if ('status' in data) {
            if (data.customMessage instanceof Array) {
                data.customMessage = data.customeMessage[0];
            }
            next(data);
        } else {
            next(new InvalidRequestError(data));
        }
    });
});

// ## Nastavení locale pro uživatele
// `GET /user/update-locale/:locale/:returnUrl`
router.get('/update-locale/:locale/:returnUrl', function(req, res, next) {
    var locale = req.params.locale,
        returnUrl = decodeURIComponent(req.params.returnUrl),
        data = {
            id: req.user.id,
            locale: locale
        };

    // Aktualizovat jazyk uživatele v databázi
    User.update(data).then(function(count) {
        // Aktualizace aktuálně přihlášeného uživatele, načtení nových dat do session.
        return User.getById(data.id, true).then(function(user) {
            req.logIn(user, function(err) {
                if (err) {
                    next(err);
                }
                res.redirect(returnUrl);
            });
        });
    }).catch(function(data) {
        console.log(data);
        if ('errors' in data) {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        } else if ('status' in data) {
            if (data.customMessage instanceof Array) {
                data.customMessage = data.customeMessage[0];
            }
            next(data);
        } else {
            next(new InvalidRequestError(data));
        }
    });
});

// ## Exportování routeru
module.exports = router;
