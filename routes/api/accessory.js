var express = require('express');
var router = express.Router();

var AuthHelper = require('../../helpers/AuthHelper');
var Accessory = require('./controllers/accessory');

// POST /api/accessory/create
router.post('/create', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var data = {
            name: req.body.name,
            available: req.body.available ? req.body.available : true
        };
        Accessory.create(data).then(function(accessory) {
            res.json(accessory);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
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
        Accessory.get(where).then(function(result) {
            res.json(result);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// GET /api/accessory/:id
router.get('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var id = req.params.id;
        Accessory.getById(id).then(function(accessory) {
            res.json(accessory);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// PUT /api/accessory/:id
router.put('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var data = {
            id: req.params.id
        };
        if (req.body.name) {
            data.name = req.body.name;
        }
        if (req.body.available) {
            data.available = req.body.available;
        }

        Accessory.update(data).then(function(accessory) {
            res.json(accessory);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// DELETE /api/accessory/:id
router.delete('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var id = req.params.id;
        Accessory.delete(id).then(function(count) {
            res.json(count);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

module.exports = router;
