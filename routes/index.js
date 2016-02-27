var express = require('express');
var router = express.Router();
var config = require('../config');

var Accessory = require('../api/accessory');

// GET /
router.get('/', function(req, res, next) {
    Accessory.get({}).then(function(result) {
        res.render('index', {
            page: 'index',
            reservationLength: config.MAX_RESERVATION_LENGTH,
            reservationUpfront: config.MAX_RESERVATION_UPFRONT,
            accessories: result.accessories,
            keyPickupFrom: config.KEY_PICKUP_FROM,
            keyPickupTo: config.KEY_PICKUP_TO,
            keyPickupInterval: config.KEY_PICKUP_INTERVAL_MINS
        });
    }).catch(function(err) {
        res.json(err);
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

module.exports = router;
