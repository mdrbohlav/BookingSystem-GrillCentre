var express = require('express');
var router = express.Router();
var config = require('../config');

var AuthHelper = require('../helpers/AuthHelper');
var Accessory = require('../api/accessory');
var Reservation = require('../api/reservation');

// GET /
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
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
    }).catch(function() {
        res.redirect('/login');
    });
});

// GET /history
router.get('/history', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        req.query.from = new Date();
        var to = new Date();
        to.setDate(to.getDate() + config.MAX_RESERVATION_UPFRONT);
        req.query.to = to;
        Reservation.get(req, res, next, function(result) {
            res.render('history', {
                page: 'history',
                reservations: result.reservations
            });
        });
    }).catch(function() {
        res.redirect('/login');
    });
});

// GET /reservations
router.get('/reservations', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        req.params.state = 'draft';
        req.query.from = new Date();
        var to = new Date();
        to.setDate(to.getDate() + config.MAX_RESERVATION_UPFRONT);
        req.query.to = to;
        Reservation.get(req, res, next, function(result) {
            res.render('reservations', {
                page: 'reservations',
                reservations: result.reservations,
                users: result.users
            });
        });
    }).catch(function() {
        res.redirect('/login');
    });
});

// GET /statistics
router.get('/statistics', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        res.render('statistics', {
            page: 'statistics'
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
