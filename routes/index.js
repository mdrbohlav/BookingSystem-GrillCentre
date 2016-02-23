var express = require('express');
var router = express.Router();

var AuthHelper = require('../helpers/AuthHelper');

// GET /
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        res.render('index', {
            page: 'index'
        });
    }).catch(function() {
        res.redirect('/login');
    });
});

// GET /config
router.get('/config', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        res.render('config', {
            page: 'config'
        });
    }).catch(function() {
        res.redirect('/login');
    });
});

// GET /login
router.get('/login', function(req, res, next) {
    if (req.user) {
        res.redirect('/');
    }
    res.render('login', {
        page: 'login'
    });
});

module.exports = router;
