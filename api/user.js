var isoLocales = require(__dirname + '/../config/isoLocales');

var AuthHelper = require(__dirname + '/../helpers/AuthHelper');

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
            data.password = hash;
            return User.findOrCreate({
                where: {
                    email: data.email
                },
                defaults: data
            }).spread(function(user, created) {
                if (!created) {
                    throw new EmailExistsError();
                }

                user = user.get({ plain: true });
                var locale = user.locale;
                user.locale = {};
                user.locale[locale] = isoLocales[locale];
                return user;
            });
        });
    },

    get(options) {
        return User.findAndCountAll(options).then(function(data) {
            var users = [];
            for (var i = 0; i < data.rows.length; i++) {
                users.push(data.rows[i].get({ plain: true }));
                var locale = users[i].locale;
                users[i].locale = {};
                users[i].locale[locale] = isoLocales[locale];
            }

            return {
                users: users,
                total: data.count
            };
        });
    },

    getById(id) {
        return User.findById(id).then(function(user) {
            user = user.get({ plain: true });
            var locale = user.locale;
            user.locale = {};
            user.locale[locale] = isoLocales[locale];
            return user;
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

            user = user.get({ plain: true });
            var locale = user.locale;
            user.locale = {};
            user.locale[locale] = isoLocales[locale];
            return user;
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
    }
}
