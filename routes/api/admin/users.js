var express = require('express');
var router = express.Router();

var AuthHelper = require('../../../helpers/AuthHelper');
var User = require('../../../api/user');

var InvalidRequestError = require('../../../errors/InvalidRequestError');

// GET /api/admin/users
router.get('/', function(req, res, next) {
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
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

module.exports = router;
