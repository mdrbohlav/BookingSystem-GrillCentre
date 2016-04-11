var sequelize = require(__dirname + '/../models/index').sequelize;
var isoLocales = require(__dirname + '/../config/isoLocales');

var AuthHelper = require(__dirname + '/../helpers/AuthHelper');
var MailHelper = require(__dirname + '/../helpers/MailHelper'),
    mail_helper = new MailHelper();

var EmailExistsError = require(__dirname + '/../errors/EmailExistsError'),
    UserDoesnotExistError = require(__dirname + '/../errors/UserDoesnotExistError');

var User = require(__dirname + '/../models').User;

function processUserUpdate(data) {
    return User.update(data, {
        where: {
            id: data.id
        }
    });
}

module.exports = {
    create(data) {
        return AuthHelper.hashPassword(data.password).then(function(hash) {
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
                return User.findOrCreate(data).spread(function(user, created) {
                    if (!created) {
                        throw new EmailExistsError();
                    }

                    user = user.get({ plain: true });
                    var locale = user.locale;
                    user.locale = {};
                    user.locale[locale] = isoLocales[locale];

                    return mail_helper.send(user, 'new_user', null, null, null, password).then(function(mailResponse) {
                        return user;
                    });
                });
            });
        });
    },

    get(options) {
        var result = {
            users: [],
            total: 0
        };

        return User.findAndCountAll(options).then(function(data) {
            result.total = data.count;
            return data.rows.reduce(function(sequence, user) {
                return sequence.then(function() {
                    return user.getRatings().then(function(ratings) {
                        var plain = user.get({  plain: true });
                        plain.ratings = [];
                        for (var i = 0; i < ratings.length; i++) {
                            plain.ratings.push(ratings[i].get({ plin: true }));
                        }
                        var locale = plain.locale;
                        plain.locale = {};
                        plain.locale[locale] = isoLocales[locale];
                        result.users.push(plain);
                    });
                });
            }, Promise.resolve());
        }).then(function() {
            return result;
        });
    },

    getById(id, raw) {
        raw = typeof(raw) === 'undefined' ? false : raw;
        return User.findById(id).then(function(user) {
            return user.getRatings().then(function(ratings) {
                var plain = user;
                if (!raw) {
                    plain = user.get({  plain: true });
                }
                plain.ratings = [];
                for (var i = 0; i < ratings.length; i++) {
                    plain.ratings.push(ratings[i].get({ plin: true }));
                }
                var locale = plain.locale;
                plain.locale = {};
                plain.locale[locale] = isoLocales[locale];
                return plain;
            });
        });
    },

    getByEmail(email) {
        return User.findOne({
            where: {
                email: email
            }
        }).then(function(user) {
            if (!user) {
                throw new UserDoesnotExistError();
            }

            return user.getRatings().then(function(ratings) {
                var plain = user.get({  plain: true });
                plain.ratings = [];
                for (var i = 0; i < ratings.length; i++) {
                    plain.ratings.push(ratings[i].get({ plin: true }));
                }
                var locale = plain.locale;
                plain.locale = {};
                plain.locale[locale] = isoLocales[locale];
                return plain;
            });
        });
    },

    update(data) {
        if (data.password) {
            return AuthHelper.hashPassword(data.password).then(function(hash) {
                data.password = hash;

                return processUserUpdate(data);
            });
        }

        return processUserUpdate(data);
    },

    delete(id) {
        return User.destroy({
            where: {
                id: id
            }
        });
    },

    count(options) {
        return User.count(options);
    },

    getReservations(id, options) {
        return User.findById(id).then(function(user) {
            var result = {
                    reservations: []
                },
                reservationsArr = [];

            return user.countReservations().then(function(count) {
                result.total = count;
                return user.getReservations(options).then(function(data) {
                    return data.reduce(function(sequence, reservation) {
                        return sequence.then(function() {
                            return reservation.getRating().then(function(rating) {
                                return reservation.getAccessories().then(function(data) {
                                    var accessories = [];

                                    for (var i = 0; i < data.length; i++) {
                                        accessories.push(data[i].get({ plain: true }));
                                    }

                                    return accessories;
                                }).then(function(accessories) {
                                    var plain = reservation.get({ plain: true });
                                    plain.rating = rating ? rating.get({ plain: true }) : rating;
                                    plain.accessories = accessories;
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

    getRatings(id) {
        return User.findById(id).then(function(user) {
            return user.getRatings().then(function(data) {
                var result = [];
                for (var i = 0; i < data.length; i++) {
                    result.push(data[i].get({ plain: true }));
                }
                return result;
            });
        });
    }
};
