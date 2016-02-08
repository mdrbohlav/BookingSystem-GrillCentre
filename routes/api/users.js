var express = require('express');
var router = express.Router();
var config = require('../../config');

var AuthHelper = require('../../helpers/AuthHelper');

var InvalidRequestError = require('../../errors/InvalidRequestError');

var User = require('../../models').User;

// GET /api/users
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var where = {},
            offset = req.query.offset ? req.query.offset : 0,
            limit = req.query.limit ? req.query.limit : 20;
        if (req.query.provider === 'native') {
            where = {
                isId: null
            };
        } else if (req.query.provider === 'is') {
            where = {
                isId: {
                    $ne: null
                }
            }
        }
        User.findAndCountAll({
            where: where,
            offset: offset,
            limit: limit
        }).then(function(data) {
            var users = [];
            for (var i = 0; i < data.rows.length; i++) {
                users.push(data.rows[i].get({
                    plain: true
                }));
            }
            res.json({
                users: users,
                total: data.count
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('Something went wrong, please try again.'));
        });
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
