var express = require('express');
var router = express.Router();
var configCustom = require('../config-custom').custom;
var ICalHelper = require('../helpers/ICalHelper');

var Accessory = require('../api/accessory');

var InvalidRequestError = require('../errors/InvalidRequestError');

// GET /
router.get('/', function(req, res, next) {
    Accessory.get({}).then(function(result) {
        res.render('index', {
            page: 'index',
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
        page: 'login'
    });
});

// GET /reservations.ical
router.get('/reservations.ical', function(req, res, next) {
    ICalHelper.calendar.serve(res);
});

module.exports = router;
