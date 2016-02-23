var express = require('express');
var router = express.Router();
var config = require('../config');

var AuthHelper = require('../helpers/AuthHelper');
var Accessory = require('./api/controllers/accessory');

// GET /
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        Accessory.get(req, res, next, function(result) {
            res.render('index', {
                page: 'index',
                reservationLength: config.MAX_RESERVATION_LENGTH,
                reservationUpfront: config.MAX_RESERVATION_UPFRONT,
                accessories: result.accessories,
                keyPickupFrom: config.KEY_PICKUP_FROM,
                keyPickupTo: config.KEY_PICKUP_TO,
                keyPickupInterval: config.KEY_PICKUP_INTERVAL_MINS
            });
        });
    }).catch(function() {
        res.redirect('/login');
    });
});

// GET /config
router.get('/config', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        res.render('config', {
            page: 'config'
        });
    }).catch(function() {
        res.redirect('/login');
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
