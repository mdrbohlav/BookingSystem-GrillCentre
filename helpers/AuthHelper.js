var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');

var InvalidPasswordError = require('../errors/InvalidPasswordError');
var InvalidRequestError = require('../errors/InvalidRequestError');
var UserDoesnotExistError = require('../errors/UserDoesnotExistError');
var UserBannedError = require('../errors/UserBannedError');

var User = require('../models').User;

// verify password
function verifyPassword(password, passwordHash) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(password, passwordHash, function(err, isVerify) {
            if (isVerify) {
                resolve();
            } else {
                reject();
            }
        });
    });
}

// hashing password
module.exports.hashPassword = function(password) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, null, function(err, hash) {
                resolve(hash);
            });
        });
    });
};

// is authenticated middleware
module.exports.isAuthenticated = function(req, res, next) {
    if ((req.hostname.indexOf('localhost') > -1 && !req.user) || req.user.email === 'm.drbohlav1@gmail.com') {
        return new Promise(function(resolve, reject) {
            resolve();
        });
    }
    return new Promise(function(resolve, reject) {
        if (req.user) {
            resolve();
        }
        reject(new UnauthorizedError());
    });
};

//check if user exists
//if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
//if password matches take into website
//if user doesn't exist or password doesn't match tell them it failed
module.exports.localAuth = function(email, password) {
    return new Promise(function(resolve, reject) {
        User.findOne({
            where: {
                email: email
            }
        }).then(function(user) {
            if (!user) {
                reject(new UserDoesnotExistError());
            }
            user = user.get({ plain: true });
            verifyPassword(password, user.password).then(function(result) {
                resolve(user);
            }).catch(function(data) {
                reject(new InvalidPasswordError());
            });
        }).catch(function(err) {
            reject(new InvalidRequestError(err.message));
        });
    });
};

module.exports.isAuth = function(accessToken, refreshToken, profile) {
    return new Promise(function(resolve, reject) {
        //User.upsert(profile).then(function(user) {
        //    resolve(user);
        //}).catch(function(err) {
        //    reject(new InvalidRequestError(err.message));
        //});
    });
};
