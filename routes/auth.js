var express = require('express');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();

var InvalidPasswordError = require('../../errors/InvalidPasswordError');
var InvalidRequestError = require('../../errors/InvalidRequestError');

var User = require('../../models').User;

// verify password
function verifyPassword(password, passwordHash) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(password, passwordHash, function(err, isVerify) {
            if (isVerify) {
                resolve();
            } else {
                return reject();
            }
        });
    });
}

// POST /auth/login/native
router.post('/login/native', function(req, res, next) {
    User.findOne({
        where: {
            email: req.body.email
        }
    }).then(function(user) {
        user = user.get({
            plain: true
        });
        verifyPassword(req.body.password, user.password).then(function() {
            
        }).catch(function() {
            return next(new InvalidPasswordError());
        });
    }).catch(function(data) {
        console.log(data);
        return next(new InvalidCredentialsError());
    });
});

// POST /auth/login/is
router.post('/login/is', function(req, res, next) {

});

// GET /auth/logout
router.get('/logout', function(req, res, next) {
    req.session.destroy(function(err) {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    });
});

module.exports = router;
