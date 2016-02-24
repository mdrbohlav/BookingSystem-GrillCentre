var express = require('express');
var router = express.Router();

var AuthHelper = require('../../helpers/AuthHelper');
var Accessory = require('./controllers/accessory');

// POST /api/accessory/create
router.post('/create', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        Accessory.create(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/accessory
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        Accessory.get(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/accessory/:id
router.get('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        Accessory.getSpecific(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

// DELETE /api/accessory/:id
router.delete('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        Accessory.delete(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
