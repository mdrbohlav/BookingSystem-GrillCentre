var express = require('express');
var router = express.Router();
var config = require('../../config');

var InvalidRequestError = require('../../errors/InvalidRequestError');

var Accessory = require('../../models').Accessory;

// POST /api/accessory/create
router.post('/create', function(req, res, next) {
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
});

// GET /api/accessory
router.get('/', function(req, res, next) {
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
});

// GET /api/accessory/:id
router.get('/:id', function(req, res, next) {
    Accessory.findById(req.params.id).then(function(accessory) {
        res.json(accessory.get({
            plain: true
        }));
    }).catch(function(data) {
        return next(new InvalidRequestError('This accessory does not exist.'));
    });
});

// DELETE /api/accessory/:id
router.delete('/:id', function(req, res, next) {
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
});

module.exports = router;
