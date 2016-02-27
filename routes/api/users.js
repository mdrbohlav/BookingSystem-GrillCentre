var express = require('express');
var router = express.Router();

var AuthHelper = require('../../helpers/AuthHelper');
var User = require('./controllers/user');

// GET /api/users
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var where = {},
            offset = req.query.offset ? req.query.offset : 0,
            limit = req.query.limit ? req.query.limit : 20;

        if (req.query.provider === 'native') {
            where.isId = null;
        } else if (req.query.provider === 'is') {
            where.isId = { $ne: null };
        }
        if (req.query.isAdmin) {
            where.isAdmin = req.query.isAdmin;
        }

        User.get(where, offset, limit).then(function(result) {
            res.json(result);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

module.exports = router;
