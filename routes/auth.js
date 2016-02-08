var express = require('express');
var passport = require('passport');
var router = express.Router();

var AuthHelper = require('../helpers/AuthHelper');

// POST /auth/login/native
router.post('/login/native', passport.authenticate('login-native', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

// POST /auth/login/is
router.post('/login/is', passport.authenticate('login-is', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

// GET /auth/logout
router.get('/logout', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var name = req.user.fullName;
        req.logout();
        req.session.notice = "You have successfully been logged out " + name + "!";
        res.redirect('/');
    }).catch(function() {
        res.redirect('/');
    });
});

module.exports = router;
