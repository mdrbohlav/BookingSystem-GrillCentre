var express = require('express');
var router = express.Router();

var AuthHelper = require('../../helpers/AuthHelper');
var User = require('./controllers/user');

// POST /api/user/create
router.post('/create', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        User.create(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/user
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        User.get(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// PUT /api/user
router.put('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        User.update(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// DELETE /api/user
router.delete('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        User.delete(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/user/reservations/:state?
router.get('/reservations/:state?', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        User.getUserReservations(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/user/:id
router.get('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        User.getSpecific(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// PUT /api/user/:id
router.put('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        User.updateSpecific(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// DELETE /api/user/:id
router.delete('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        User.deleteSpecific(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/user/:id/reservations/:state?
router.get('/:id/reservations/:state?', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        User.getSpecificUserReservations(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
