var crypto = require('crypto'),
    bcrypt = require('bcrypt-nodejs'),
    isoLocales = require(__dirname + '/../config/isoLocales');

var InvalidPasswordError = require(__dirname + '/../errors/InvalidPasswordError'),
    InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError'),
    UnauthorizedError = require(__dirname + '/../errors/UnauthorizedError'),
    UserDoesnotExistError = require(__dirname + '/../errors/UserDoesnotExistError'),
    UserBannedError = require(__dirname + '/../errors/UserBannedError'),
    NotPaidError = require(__dirname + '/../errors/NotPaidError'),
    GetFile = require(__dirname + '/../helpers/GetFile');

var User = require(__dirname + '/../models').User,
    UserApi = require(__dirname + '/../api/user');

function prepareISData(profile) {
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom,
        adminIDs = configCustom.ADMIN_IS.split(';'),
        data = {
            email: profile.email,
            isId: profile.id,
            phone: profile.phone,
            firstname: profile.first_name,
            lastname: profile.surname
        };

    if (adminIDs.indexOf(profile.id.toString()) > -1) {
        data.isAdmin = true;
    }

    return data;
}

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
                throw new UserDoesnotExistError();
            }
            if (user.banned) {
                throw new UserBannedError();
            }
            var lastLogin = new Date().toISOString();
            return User.update({
                lastLogin: lastLogin
            }, {
                where: {
                    id: user.id
                }
            }).then(function(count) {
                return user;
            });
        }).then(function(user) {
            user = user.get({ plain: true });
            return verifyPassword(password, user.password).then(function(result) {
                var locale = user.locale;
                user.locale = {};
                user.locale[locale] = isoLocales[locale];
                return user;
            }).catch(function(data) {
                throw new InvalidPasswordError();
            });
        }).then(function(user) {
            resolve(user);
        }).catch(function(err) {
            reject(err);
        });
    });
};

module.exports.isAuth = function(accessToken, refreshToken, profile) {
    return new Promise(function(resolve, reject) {
        var today = new Date();
        today.setUTCHours(23, 59, 59, 999);
        var serviceExpire = new Date(profile.service.to);
        serviceExpire.setUTCHours(23, 59, 59, 999);

        if (today > serviceExpire) {
            reject(new NotPaidError());
        }

        profile = prepareISData(profile);
        profile.lastLogin = new Date().toISOString();

        User.upsert(profile).then(function(created) {
            return UserApi.getByEmail(profile.email).then(function(user) {
                if (user.banned) {
                    throw new UserBannedError();
                }

                if (created && profile.locale) {
                    var data = {
                        id: user.id,
                        locale: profile.locale
                    };
                    return UserApi.update(data).then(function(count) {
                        if (count) {
                            user.locale = profile.locale;
                        }
                        return user;
                    });
                } else {
                    return user;
                }
            });
        }).then(function(user) {
            resolve(user);
        }).catch(function(err) {
            reject(err);
        });
    });
};
