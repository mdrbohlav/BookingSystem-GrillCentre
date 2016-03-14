var express = require('express'),
    passport = require('passport'),
    router = express.Router();

var AuthHelper = require(__dirname + '/../helpers/AuthHelper');

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
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var name = req.user.fullName;
        req.logout();
        req.session.notice = req.i18n.__('success_logged_out');
        res.redirect('/login');
    }).catch(function() {
        res.redirect('/login');
    });
});

module.exports = router;
