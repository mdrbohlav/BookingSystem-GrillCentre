var express = require('express');
var router = express.Router();

var AuthHelper = require('../../helpers/AuthHelper');
var Reservation = require('./controllers/reservation');

// POST /api/reservation/create
router.post('/create', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        Reservation.create(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/reservation
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        Reservation.get(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/reservation/:id
router.get('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        Reservation.getSpecific(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// POST /api/reservation/:id/confirm
router.post('/:id/confirm', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        Reservation.confirm(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// POST /api/reservation/:id/reject
router.post('/:id/reject', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        Reservation.reject(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// POST /api/reservation/:id/rating
router.post('/:id/rating', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        Reservation.rating(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
