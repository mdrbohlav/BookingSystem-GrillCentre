var express = require('express');
var passport = require('passport');
var router = express.Router();

// POST /auth/login/native
router.post('/login/native', passport.authenticate('login-native', {
    successRedirect: '/',
    failureRedirect: '/?login=true'
}));

// POST /auth/login/is
router.post('/login/is', passport.authenticate('login-is', {
    successRedirect: '/',
    failureRedirect: '/?login=true'
}));

// GET /auth/logout
router.get('/logout', function(req, res){
  var name = req.user.fullName;
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

module.exports = router;
