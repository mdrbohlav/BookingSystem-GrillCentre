var express = require('express');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();
var config = require('../../config');

var EmailExistsError = require('../../errors/EmailExistsError');
var InvalidRequestError = require('../../errors/InvalidRequestError');

var User = require('../../models').User;

// hashing password
function hashPassword(password) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, null, function(err, hash) {
                resolve(hash);
            });
        });
    });
}

// POST /api/user/create
router.post('/create', function(req, res, next) {
    hashPassword(req.body.password).then(function(passwordHash) {
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
});

// GET /api/user
router.get('/', function(req, res, next) {
    var where = {},
        offset = req.query.offset ? req.query.offset : 0,
        limit = req.query.limit ? req.query.limit : 20;
    if (req.query.provider === 'native') {
        where = {
            isId: null
        };
    } else if (req.query.provider === 'is') {
        where = {
            isId: {
                $ne: null
            }
        }
    }
    User.findAndCountAll({
        where: where,
        offset: offset,
        limit: limit
    }).then(function(data) {
        var users = [];
        for (var i = 0; i < data.rows.length; i++) {
            users.push(data.rows[i].get({
                plain: true
            }));
        }
        res.json({
            users: users,
            total: data.count
        });
    }).catch(function(data) {
        return next(new InvalidRequestError('Something went wrong, please try again.'));
    });
});

// GET /api/user/:id
router.get('/:id', function(req, res, next) {
    User.findById(req.params.id).then(function(user) {
        res.json(user.get({
            plain: true
        }));
    }).catch(function(data) {
        return next(new InvalidRequestError('This user does not exist.'));
    });
});

// DELETE /api/user/:id
router.delete('/:id', function(req, res, next) {
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
});

// GET /api/user/:id/reservations/:state?
router.get('/:id/reservations/:state?', function(req, res, next) {
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
});

module.exports = router;
