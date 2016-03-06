var express = require('express');
var router = express.Router();

var AuthHelper = require(__dirname + '/../../../helpers/AuthHelper'),
    Accessory = require(__dirname + '/../../../api/accessory');

var InvalidRequestError = require(__dirname + '/../../../errors/InvalidRequestError');

// POST /api/admin/accessory/create
router.post('/create', function(req, res, next) {
    var data = {
        name: req.body.name,
        nameEn: req.body.nameEn,
        available: req.body.available ? req.body.available : true
    };
    Accessory.create(data).then(function(accessory) {
        res.json(accessory);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// PUT /api/admin/accessory/:id
router.put('/:id', function(req, res, next) {
    var data = {
        id: req.params.id
    };
    if (req.body.name) {
        data.name = req.body.name;
    }
    if (req.body.available) {
        data.available = req.body.available;
    }

    Accessory.update(data).then(function(count) {
        res.json(count);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// DELETE /api/admin/accessory/:id
router.delete('/:id', function(req, res, next) {
    var id = req.params.id;
    Accessory.delete(id).then(function(count) {
        res.json(count);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

module.exports = router;
