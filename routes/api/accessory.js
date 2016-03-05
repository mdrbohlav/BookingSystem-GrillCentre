var express = require('express'),
    router = express.Router();

var Accessory = require('../../api/accessory');

var InvalidRequestError = require('../../errors/InvalidRequestError');

// GET /api/accessory
router.get('/', function(req, res, next) {
    var where = {};
    if (req.query.available) {
        where = {
            available: req.query.available === 'true' ? true : false
        };
    }
    Accessory.get(where).then(function(result) {
        res.json(result);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// GET /api/accessory/:id
router.get('/:id', function(req, res, next) {
    var id = req.params.id;
    Accessory.getById(id).then(function(accessory) {
        res.json(accessory);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

module.exports = router;
