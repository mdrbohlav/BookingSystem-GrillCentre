var express = require('express');
var router = express.Router();

var AuthHelper = require('../helpers/AuthHelper');

// homepage
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        res.render('index');
    }).catch(function() {
        res.redirect('/login');
    });
});

// config
router.get('/config', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        res.render('config');
    }).catch(function() {
        res.redirect('/login');
    });
});

// login
router.get('/login', function(req, res, next) {
    res.render('login');
});

module.exports = router;
