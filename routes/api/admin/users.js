var express = require('express'),
    router = express.Router();

var AuthHelper = require(__dirname + '/../../../helpers/AuthHelper'),
    User = require(__dirname + '/../../../api/user');

var InvalidRequestError = require(__dirname + '/../../../errors/InvalidRequestError');

// GET /api/admin/users
router.get('/', function(req, res, next) {
    var options = {
        where: {},
        offset: req.query.offset ? req.query.offset : 0,
        limit: req.query.limit ? req.query.limit : 20
    };

    if (req.query.provider === 'native') {
        options.where.isId = null;
    } else if (req.query.provider === 'is') {
        options.where.isId = { $ne: null };
    }
    if (req.query.isAdmin) {
        options.where.isAdmin = req.query.isAdmin;
    }
    if (req.query.orderBy && req.query.order) {
        options.order = [ [ req.query.orderBy, req.query.order ] ];
    }

    User.get(options).then(function(result) {
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
