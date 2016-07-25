// # Uživatel
var sequelize = require(__dirname + '/../models/index').sequelize;
var isoLocales = require(__dirname + '/../config/isoLocales');

// [Helper pro autentizaci](../helpers/AuthHelper.html)
var AuthHelper = require(__dirname + '/../helpers/AuthHelper');
// [Helper pro e-maily](../helpers/MailHelper.html)
var MailHelper = require(__dirname + '/../helpers/MailHelper'),
    mail_helper = new MailHelper();

var EmailExistsError = require(__dirname + '/../errors/EmailExistsError'),
    UserDoesnotExistError = require(__dirname + '/../errors/UserDoesnotExistError');

// [Model uživatele](../models/user.html)
var User = require(__dirname + '/../models').User;

// ## Funkce provedení aktualizace dat
function processUserUpdate(data) {
    return User.update(data, {
        where: {
            id: data.id
        }
    });
}

module.exports = {
    // ## Vytvoření uživatele
    create(data) {
        // Nejprve zahashujeme heslo.
        return AuthHelper.hashPassword(data.password).then(function(hash) {
            // Vytvoříme transakci, kdyby se vyskytla chyba, nebudou provedeny žádné změny.
            return sequelize.transaction(function(t) {
                password = data.password;
                data.password = hash;
                data = {
                    where: {
                        email: data.email
                    },
                    defaults: data,
                    transaction: t
                };

                // Pokus o vytvoření uživatele.
                return User.findOrCreate(data).spread(function(user, created) {
                    // Pokud uživatel existuje, vrátit chybu `EmailExistsError`.
                    if (!created) {
                        throw new EmailExistsError();
                    }

                    // Jinak nastavit správný jazyk.
                    user = user.get({ plain: true });
                    var locale = user.locale;
                    user.locale = {};
                    user.locale[locale] = isoLocales[locale];

                    // Odeslat e-mail s daty o novém uživateli.
                    return mail_helper.send(user, 'new_user', null, null, password).then(function(mailResponse) {
                        return user;
                    });
                });
            });
        });
    },

    // ## Získání všech uživatelů
    get(options) {
        var result = {
            users: [],
            total: 0
        };

        // Dotaz na všechny uživatele a jejic počet.
        return User.findAndCountAll(options).then(function(data) {
            // Přidání celkového počtu uživatelů do objektu s odpovědí.
            result.total = data.count;
            
            // Dotaz na hodnocení jednotlivých uživatelů.
            return data.rows.reduce(function(sequence, user) {
                return sequence.then(function() {
                    return user.getRatings().then(function(ratings) {
                        var plain = user.get({  plain: true });

                        // Přidání jednotlivých hodnocení do pole.
                        plain.ratings = [];
                        for (var i = 0; i < ratings.length; i++) {
                            plain.ratings.push(ratings[i].get({ plin: true }));
                        }
                        var locale = plain.locale;
                        plain.locale = {};
                        plain.locale[locale] = isoLocales[locale];

                        // Přidání uživatele do objektu s odpovědí.
                        result.users.push(plain);
                    });
                });
            }, Promise.resolve());
        }).then(function() {
            return result;
        });
    },

    // ## Získání uživatele podle ID
    getById(id, raw) {
        // True pokud chceme raw data.
        raw = typeof(raw) === 'undefined' ? false : raw;

        // Dotaz na uživatele podle ID.
        return User.findById(id).then(function(user) {
            // Dotaz na hodnocení uživatele.
            return user.getRatings().then(function(ratings) {
                var plain = user;
                if (!raw) {
                    plain = user.get({  plain: true });
                }

                // Přidání jednotlivých hodnocení do pole.
                plain.ratings = [];
                for (var i = 0; i < ratings.length; i++) {
                    plain.ratings.push(ratings[i].get({ plin: true }));
                }

                // Nastavení lepšího popisu jazyka.
                var locale = plain.locale;
                plain.locale = {};
                plain.locale[locale] = isoLocales[locale];
                return plain;
            });
        });
    },

    // ## Získání uživatele podle e-mailu
    getByEmail(email) {
        // Dotaz na uživatele podle e-mailu.
        return User.findOne({
            where: {
                email: email
            }
        }).then(function(user) {
            // Pokud uživatel neexistuje, vrátit chybu `UserDoesnotExistError`.
            if (!user) {
                throw new UserDoesnotExistError();
            }

            // Dotaz na hodnocení uživatele.
            return user.getRatings().then(function(ratings) {
                var plain = user.get({  plain: true });

                // Přidání jednotlivých hodnocení do pole.
                plain.ratings = [];
                for (var i = 0; i < ratings.length; i++) {
                    plain.ratings.push(ratings[i].get({ plin: true }));
                }

                // Nastavení lepšího popisu jazyka.
                var locale = plain.locale;
                plain.locale = {};
                plain.locale[locale] = isoLocales[locale];
                return plain;
            });
        });
    },

    // ## Aktualizace uživatele
    update(data) {
        // Pokud se aktualizuje i heslo, zahashovat ho nejprve.
        if (data.password) {
            return AuthHelper.hashPassword(data.password).then(function(hash) {
                data.password = hash;

                // Provést aktualizaci dat.
                return processUserUpdate(data);
            });
        }

        // Jinak provést aktualizaci dat okamžitě.
        return processUserUpdate(data);
    },

    // ## Smazání uživatele
    delete(id) {
        return User.destroy({
            where: {
                id: id
            }
        });
    },

    // ## Spočítání uživatelů
    count(options) {
        return User.count(options);
    },

    // ## Získání rezervací uživatele
    getReservations(id, options) {
        // Dotaz na uživatele podle ID.
        return User.findById(id).then(function(user) {
            var result = {
                    reservations: []
                },
                reservationsArr = [];

            // Dotaz na počet rezervaí uživatele.
            return user.countReservations().then(function(count) {
                // Přidání celkového počtu rezervaí do objektu s odpovědí.
                result.total = count;

                // Dotaz na rezervace uživatele.
                return user.getReservations(options).then(function(data) {
                    return data.reduce(function(sequence, reservation) {
                        return sequence.then(function() {
                            // Dotaz na hodnocení jednoylicých rezervací.
                            return reservation.getRating().then(function(rating) {
                                // Dotaz na příslušenstí jednotlivých rezervací.
                                return reservation.getAccessories().then(function(data) {
                                    // Přidání jednotlivých příslušenství do pole.
                                    var accessories = [];
                                    for (var i = 0; i < data.length; i++) {
                                        accessories.push(data[i].get({ plain: true }));
                                    }

                                    return accessories;
                                }).then(function(accessories) {
                                    var plain = reservation.get({ plain: true });

                                    // Přidání jednotlivých hodnocení a příslušenství k rezervaci.
                                    plain.rating = rating ? rating.get({ plain: true }) : rating;
                                    plain.accessories = accessories;

                                    // Přidání rezervace do objektu s odpovědí.
                                    result.reservations.push(plain);
                                });
                            });
                        });
                    }, Promise.resolve());
                }).then(function() {
                    return result;
                });
            });
        });
    },

    // ## Získání hodnocení uživatele
    getRatings(id) {
        // Dotaz na uživatele podle ID.
        return User.findById(id).then(function(user) {
            // Dotaz na jeho hodnocení.
            return user.getRatings().then(function(data) {
                // Přidání jednotlivých hodnocení do pole.
                var result = [];
                for (var i = 0; i < data.length; i++) {
                    result.push(data[i].get({ plain: true }));
                }
                return result;
            });
        });
    }
};
