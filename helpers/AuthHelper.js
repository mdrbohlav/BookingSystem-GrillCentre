var crypto = require('crypto'),
    bcrypt = require('bcrypt-nodejs'),
    isoLocales = require(__dirname + '/../config/isoLocales');

var InvalidPasswordError = require(__dirname + '/../errors/InvalidPasswordError'),
    InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError'),
    UnauthorizedError = require(__dirname + '/../errors/UnauthorizedError'),
    UserDoesnotExistError = require(__dirname + '/../errors/UserDoesnotExistError'),
    UserBannedError = require(__dirname + '/../errors/UserBannedError');

var User = require(__dirname + '/../models').User;

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
            if (user.banned) {
                reject(new UserBannedError());
            }
            user = user.get({ plain: true });
            verifyPassword(password, user.password).then(function(result) {
                var locale = user.locale;
                user.locale = {};
                user.locale[locale] = isoLocales[locale];
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
