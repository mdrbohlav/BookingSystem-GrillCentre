// # Autentizace
var express = require('express'),
    passport = require('passport'),
    router = express.Router();

// [Helper pro autentizaci](../helpers/AuthHelper.html)
var AuthHelper = require(__dirname + '/../helpers/AuthHelper');

// ## Nativní přihlášení
// `POST /auth/login/native`
router.post('/login/native', passport.authenticate('login-native', { failureRedirect: '/login' }), function(req, res, next) {
    // Pokud se přihlásil admin, jít na rezervace.
    if (req.user.isAdmin) {
        res.redirect('/admin/reservations');
    // Jinak na hlavní stránku.
    } else {
        res.redirect('/');
    }
});

// ## OAuth callback
// `GET /auth/login/is/init`
router.get('/login/is/init', passport.authenticate('login-is'));

// ## IS přihlášení
// `GET /auth/login/is`
router.get('/login/is', passport.authenticate('login-is', { failureRedirect: '/login' }), function(req, res, next) {
    // Pokud se přihlásil admin, jít na rezervace.
    if (req.user.isAdmin) {
        res.redirect('/admin/reservations');
    // Jinak na hlavní stránku.
    } else {
        res.redirect('/');
    }
});

// ## Odhlášení
// `GET /auth/logout`
router.get('/logout', function(req, res, next) {
    // Pokud uživatel přihlášen, prov=st odhlášení.
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var name = req.user.fullName;
        req.logout();
        req.session.notice = req.i18n.__('success_logged_out');
        res.redirect('/login');
    // Jinak přesměrování na přihlášení.
    }).catch(function() {
        res.redirect('/login');
    });
});

// ## Exportování routeru
module.exports = router;
