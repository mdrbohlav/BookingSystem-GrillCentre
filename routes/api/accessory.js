var express = require('express');
var router = express.Router();
var config = require('../../config');

var AuthHelper = require('../../helpers/AuthHelper');

var InvalidRequestError = require('../../errors/InvalidRequestError');

var Accessory = require('../../models').Accessory;

// POST /api/accessory/create
router.post('/create', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var data = {
            name: req.body.name,
            available: req.body.available ? req.body.available : true
        };
        Accessory.create(data).then(function(accessory) {
            res.json(accessory.get({
                plain: true
            }));
        }).catch(function(data) {
            return next(new InvalidRequestError(data.errors));
        });
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/accessory
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var where = {};
        if (req.query.available) {
            where = {
                available: req.query.available === 'true' ? true : false
            };
        }
        Accessory.findAndCountAll({
            where: where
        }).then(function(data) {
            var accessories = [];
            for (var i = 0; i < data.rows.length; i++) {
                accessories.push(data.rows[i].get({
                    plain: true
                }));
            }
            res.json({
                accessories: accessories,
                total: data.count
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('This accessory does not exist.'));
        });
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/accessory/:id
router.get('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        Accessory.findById(req.params.id).then(function(accessory) {
            res.json(accessory.get({
                plain: true
            }));
        }).catch(function(data) {
            return next(new InvalidRequestError('This accessory does not exist.'));
        });
    }).catch(function(err) {
        return next(err);
    });
});

// DELETE /api/accessory/:id
router.delete('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        Accessory.destroy({
            where: {
                id: req.params.id
            }
        }).then(function(destroyedRows) {
            res.json({
                success: true,
                destroyedRows: destroyedRows
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('This accessory does not exist.'));
        });
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
