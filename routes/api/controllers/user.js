var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var config = require('../../../config');

var AuthHelper = require('../../../helpers/AuthHelper');
var EmailExistsError = require('../../../errors/EmailExistsError');
var InvalidRequestError = require('../../../errors/InvalidRequestError');

function processUserUpdate(req, res, next, id, passwordHash) {
    passwordHash = typeof(passwordHash) === 'undefined' ? null : passwordHash;
    var data = {};
    if (passwordHash) {
        data.password = passwordHash;
    }
    if (req.body.email) {
        data.email = req.body.email;
    }
    if (req.body.firstname) {
        data.firstname = req.body.firstname;
    }
    if (req.body.lastname) {
        data.lastname = req.body.lastname;
    }
    if (req.body.block) {
        data.block = req.body.block;
    }
    if (req.body.room) {
        data.room = req.body.room;
    }
    if (req.user.isAdmin) {
        if (req.body.isAdmin) {
            data.isAdmin = req.body.isAdmin;
        }
        if (req.body.priority) {
            data.priority = req.body.priority;
        }
    }
    User.update(data, {
        where: {
            id: id
        }
    }).then(function(affectedRows) {
        res.json({
            success: true,
            affectedRows: affectedRows
        });
    }).catch(function(data) {
        return next(new InvalidRequestError(data.errors));
    });
}

module.exports = {
    create(req, res, next) {
        AuthHelper.hashPassword(req.body.password).then(function(passwordHash) {
            var data = {
                password: passwordHash,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                block: req.body.block,
                room: req.body.room
            };
            User.findOrCreate({
                where: {
                    email: req.body.email
                },
                defaults: data
            }).spread(function(user, created) {
                if (!created) {
                    return next(new EmailExistsError());
                }

                res.json(user.get({
                    plain: true
                }));
            }).catch(function(data) {
                return next(new InvalidRequestError(data.errors));
            });
        });
    },

    get(req, res, next) {
        User.findById(req.user.id).then(function(user) {
            res.json(user.get({
                plain: true
            }));
        }).catch(function(data) {
            return next(new InvalidRequestError('Something went wrong, please try again.'));
        });
    },

    update(req, res, next) {
        if (req.body.password) {
            AuthHelper.hashPassword(req.body.password).then(function(passwordHash) {
                processUserUpdate(req, res, next, req.user.id, passwordHash);
            });
        } else {
            processUserUpdate(req, res, next, req.user.id);
        }
    },

    delete(req, res, next) {
        User.destroy({
            where: {
                id: req.user.id
            }
        }).then(function(destroyedRows) {
            res.json({
                success: true,
                destroyedRows: destroyedRows
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('This user does not exist.'));
        });
    },

    getUserReservations(req, res, next) {
        var where = {};
        if (req.params.state) {
            where.state = req.params.state;
        }
        User.findById(req.user.id).then(function(user) {
            user.getReservations({
                where
            }).then(function(data) {
                var reservations = [],
                    unfetchedReservations = data.length,
                    mapReservationIndex = {};

                if (unfetchedReservations === 0) {
                    res.json(reservations);
                }
                for (var i = 0; i < data.length; i++) {
                    reservations.push(data[i].get({
                        plain: true
                    }));
                    reservations[i].rating = null;
                    mapReservationIndex[reservations[i].id] = i;
                    data[i].getRating().then(function(rating) {
                        if (rating) {
                            reservations[mapReservationIndex[rating.reservationId]].rating = rating;
                        }
                        if (--unfetchedReservations === 0) {
                            res.json(reservations);
                        }
                    });
                }
            }).catch(function(data) {
                console.log(data);
                return next(new InvalidRequestError('Something went wrong, please try again.'));
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('This user does not exist.'));
        });
    },

    getSpecific(req, res, next) {
        User.findById(req.params.id).then(function(user) {
            res.json(user.get({
                plain: true
            }));
        }).catch(function(data) {
            return next(new InvalidRequestError('This user does not exist.'));
        });
    },

    updateSpecific(req, res, next) {
        if (req.body.password) {
            AuthHelper.hashPassword(req.body.password).then(function(passwordHash) {
                processUserUpdate(req, res, next, req.params.id, passwordHash);
            });
        } else {
            processUserUpdate(req, res, next, req.params.id);
        }
    },

    deleteSpecific(req, res, next) {
        User.destroy({
            where: {
                id: req.params.id
            }
        }).then(function(destroyedRows) {
            res.json({
                success: true,
                destroyedRows: destroyedRows
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('This user does not exist.'));
        });
    },

    getSpecificUserReservations(req, res, next) {
        var where = {};
        if (req.params.state) {
            where.state = req.params.state;
        }
        User.findById(req.params.id).then(function(user) {
            user.getReservations({
                where
            }).then(function(data) {
                var reservations = [],
                    unfetchedReservations = data.length,
                    mapReservationIndex = {};

                if (unfetchedReservations === 0) {
                    res.json(reservations);
                }
                for (var i = 0; i < data.length; i++) {
                    reservations.push(data[i].get({
                        plain: true
                    }));
                    reservations[i].rating = null;
                    mapReservationIndex[reservations[i].id] = i;
                    data[i].getRating().then(function(rating) {
                        if (rating) {
                            reservations[mapReservationIndex[rating.reservationId]].rating = rating;
                        }
                        if (--unfetchedReservations === 0) {
                            res.json(reservations);
                        }
                    });
                }
            }).catch(function(data) {
                console.log(data);
                return next(new InvalidRequestError('Something went wrong, please try again.'));
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('This user does not exist.'));
        });
    }
}
