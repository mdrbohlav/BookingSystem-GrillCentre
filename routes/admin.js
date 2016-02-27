var express = require('express');
var router = express.Router();
var config = require('../config');

var Reservation = require('../api/reservation');

// GET /admin/reservations
router.get('/reservations', function(req, res, next) {
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
});

// GET /admin/statistics
router.get('/statistics', function(req, res, next) {
    res.render('statistics', {
        page: 'statistics'
    });
});

// GET /admin/config
router.get('/config', function(req, res, next) {
    res.render('config', {
        page: 'config'
    });
});

module.exports = router;
