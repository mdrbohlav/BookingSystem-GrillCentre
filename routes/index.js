// # Základní routy
var express = require('express'),
    router = express.Router();

// [Helper pro iCal](../helpers/ICalHelper.html)
var ICalHelper = require(__dirname + '/../helpers/ICalHelper'),
    ical_helper = new ICalHelper();
// [Helper pro načtení souboru](../helpers/GetFile.html)
var GetFile = require(__dirname + '/../helpers/GetFile'),
    Accessory = require(__dirname + '/../api/accessory');

var InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError');

// ## Hlavní stránka
// `GET /`
router.get('/', function(req, res, next) {
    // Načtení config souboru.
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom;

    if (req.cookies.locale) {
        res.clearCookie('locale');
    }

    // Dotaz na všechna příslušenství.
    Accessory.get({}).then(function(result) {
        res.render('index', {
            page: 'index',
            title: req.i18n.__('title'),
            description: req.i18n.__('description'),
            reservationLength: configCustom.MAX_RESERVATION_LENGTH,
            reservationUpfront: configCustom.MAX_RESERVATION_UPFRONT,
            accessories: result.accessories,
            keyPickupFrom: configCustom.KEY_PICKUP_FROM,
            keyPickupTo: configCustom.KEY_PICKUP_TO,
            keyPickupInterval: configCustom.KEY_PICKUP_INTERVAL_MINS
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

// ## Přihlašovací stránka
// `GET /login`
router.get('/login', function(req, res, next) {
    // Pokud již přihlášen, přesměrovat na hlavní stránku.
    if (req.user) {
        res.redirect('/');
    // Jinak vykreslit šablonu.
    } else {
        res.render('login', {
            page: 'login',
            title: req.i18n.__('titles_6') + ' | ' + req.i18n.__('title'),
            description: req.i18n.__('description'),
        });
    }
});

// ## Kalendář s předrzervacema
// `GET /reservations-draft.ical`
router.get('/reservations-draft.ical', function(req, res, next) {
    ical_helper.createDraft().then(function(calendar) {
        calendar.serve(res);
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

// ## Kalendář s potvrzenýma rezrvacema
// `GET /reservations.ical`
router.get('/reservations.ical', function(req, res, next) {
    ical_helper.createConfirmedFinished().then(function(calendar) {
        calendar.serve(res);
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
// `GET /update-locale/:locale/:returnUrl`
router.get('/update-locale/:locale/:returnUrl', function(req, res, next) {
    var locale = req.params.locale,
        returnUrl = decodeURIComponent(req.params.returnUrl);

    // Pokud není uživatel přihlášen, uložit do cookies.
    if (!req.user) {
        res.cookie('locale', locale);
        res.redirect(returnUrl);
    // Jinak uložit do databáze.
    } else {
        res.redirect('/user/update-locale/' + locale + '/' + encodeURIComponent(req.params.returnUrl));
    }
});

// ## Exportování routeru
module.exports = router;
