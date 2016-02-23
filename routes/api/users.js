var express = require('express');
var router = express.Router();

var AuthHelper = require('../../helpers/AuthHelper');
var Users = require('./controllers/users');

// GET /api/users
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        Users.get(req, res, next);
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
