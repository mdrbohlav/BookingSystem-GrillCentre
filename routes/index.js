var express = require('express'),
    router = express.Router(),
    configCustom = require(__dirname + '/../config/app').custom;

var ICalHelper = require(__dirname + '/../helpers/ICalHelper'),
    Accessory = require(__dirname + '/../api/accessory');

var InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError');

// GET /
router.get('/', function(req, res, next) {
    if (req.cookies.locale) {
        res.clearCookie('locale');        
    }
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
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// GET /login
router.get('/login', function(req, res, next) {
    if (req.user) {
        res.redirect('/');
    }
    res.render('login', {
        page: 'login',
        title: req.i18n.__('titles_6') + ' | ' + req.i18n.__('title'),
        description: req.i18n.__('description'),
    });
});

// GET /reservations.ical
router.get('/reservations.ical', function(req, res, next) {
    ICalHelper.calendar.serve(res);
});

// GET /update-locale/:locale/:returnUrl
router.get('/update-locale/:locale/:returnUrl', function(req, res, next) {
    var locale = req.params.locale,
        returnUrl = decodeURIComponent(req.params.returnUrl);

    if (!req.user) {
        res.cookie('locale', locale);
        res.redirect(returnUrl);
    } else {
        res.redirect('/user/update-locale/' + locale + '/' + req.params.returnUrl);
    }
});

module.exports = router;
