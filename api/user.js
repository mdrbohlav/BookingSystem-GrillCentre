var AuthHelper = require('../helpers/AuthHelper');

var EmailExistsError = require('../errors/EmailExistsError'),
    UserDoesnotExistError = require('../errors/UserDoesnotExistError');

var User = require('../models').User;

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

                return user.get({ plain: true });
            });
        });
    },

    get(options) {
        return User.findAndCountAll(options).then(function(data) {
            var users = [];
            for (var i = 0; i < data.rows.length; i++) {
                users.push(data.rows[i].get({ plain: true }));
            }

            return {
                users: users,
                total: data.count
            };
        });
    },

    getById(id) {
        return User.findById(id).then(function(user) {
            return user.get({ plain: true });
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

            return user.get({ plain: true });
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
