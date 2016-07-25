// # Autentizace
var crypto = require('crypto'),
    bcrypt = require('bcrypt-nodejs'),
    isoLocales = require(__dirname + '/../config/isoLocales');

var InvalidPasswordError = require(__dirname + '/../errors/InvalidPasswordError'),
    InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError'),
    UnauthorizedError = require(__dirname + '/../errors/UnauthorizedError'),
    UserDoesnotExistError = require(__dirname + '/../errors/UserDoesnotExistError'),
    UserBannedError = require(__dirname + '/../errors/UserBannedError'),
    NotPaidError = require(__dirname + '/../errors/NotPaidError'),
    // [Helper pro načtení souboru](../helpers/GetFile.html)
    GetFile = require(__dirname + '/../helpers/GetFile');

// [Model uživatele](../models/user.html)
var User = require(__dirname + '/../models').User,
    // [API pro uživatele](../api/user.html)
    UserApi = require(__dirname + '/../api/user');

// ## Funkce na přípravu vložení dat z ISu do databáze.
function prepareISData(profile) {
    // Načtení konfigurace kvůli UID adminů.
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom,
        adminIDs = configCustom.ADMIN_IS.split(';'),
        data = {
            email: profile.email,
            isId: profile.id,
            phone: profile.phone,
            firstname: profile.first_name,
            lastname: profile.surname
        };

    // Pokud UID uživatele mezi UID adminů, nastavit práva.
    if (adminIDs.indexOf(profile.id.toString()) > -1) {
        data.isAdmin = true;
    }

    return data;
}

// ## Kontrola správnosti hesla
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

// ## Hashování hesla
module.exports.hashPassword = function(password) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, null, function(err, hash) {
                resolve(hash);
            });
        });
    });
};

// ## Uživatel je přihlášen middleware
module.exports.isAuthenticated = function(req, res, next) {
    return new Promise(function(resolve, reject) {
        if (req.user) {
            resolve();
        }
        // Pokud není uživatel přihlášen, brácena chyba `UnauthorizedError`.
        reject(new UnauthorizedError());
    });
};

// ## Nativní přihlášení
module.exports.localAuth = function(email, password) {
    return new Promise(function(resolve, reject) {
        User.findOne({
            where: {
                email: email
            }
        }).then(function(user) {
            // Vrátit chybu `UserDoesnotExistError`, pokud uživatel neexistuje.
            if (!user) {
                throw new UserDoesnotExistError();
            }
            // Vrátit chybu `UserBannedError`, pokud má uživatel zakázaný přístup.
            if (user.banned) {
                throw new UserBannedError();
            }

            user = user.get({ plain: true });
            // Kontrola hesla
            return verifyPassword(password, user.password).then(function(result) {
                // Aktualizace data posledního přihlášení.
                var lastLogin = new Date().toISOString();
                return User.update({
                    lastLogin: lastLogin
                }, {
                    where: {
                        id: user.id
                    }
                }).then(function(count) {
                    // Načtení více informací o jazyce uživatele a vrácení jeho objektu.
                    var locale = user.locale;
                    user.locale = {};
                    user.locale[locale] = isoLocales[locale];
                    return user;
                });
            }).catch(function(data) {
                // Pokud špatné heslo, vrátit `InvalidPasswordError`.
                throw new InvalidPasswordError();
            });
        }).then(function(user) {
            resolve(user);
        }).catch(function(err) {
            reject(err);
        });
    });
};

// ## IS přihlášení
module.exports.isAuth = function(accessToken, refreshToken, profile) {
    return new Promise(function(resolve, reject) {
        // Kontrola platnosti služby.
        var today = new Date();
        today.setUTCHours(23, 59, 59, 999);
        var serviceExpire = new Date(profile.service.to);
        serviceExpire.setUTCHours(23, 59, 59, 999);

        // Pokud není služba aktivní, vrátit chybu `NotPaidError`.
        if (today > serviceExpire) {
            reject(new NotPaidError());
        }

        // Příprava dat z ISu do databáze.
        profile = prepareISData(profile);
        // Aktualizace data posledního přihlášení.
        profile.lastLogin = new Date().toISOString();

        // Dotaz do databáze, který vytvoří, nebo upraví uživatele.
        User.upsert(profile).then(function(created) {
            // Získání dat o uživateli.
            return UserApi.getByEmail(profile.email).then(function(user) {
                // Vrátit chybu `UserBannedError`, pokud má uživatel zakázaný přístup.
                if (user.banned) {
                    throw new UserBannedError();
                }

                // Pokud by uživatel nově vytvořen, nastavit správné locale v databázi a vrátit
                // jeho objekt.
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
