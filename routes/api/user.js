var express = require('express');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();
var config = require('../../config');

var EmailExistsError = require('../../errors/EmailExistsError');
var InvalidRequestError = require('../../errors/InvalidRequestError');

var User = require('../../models').User;

/* Hashing password */
function hashPassword(password) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(password, salt, null, function(err, hash) {
                resolve(hash);
            });
        });
    });
}

/* Verify password */
function verifyPassword(password, passwordHash) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(password, passwordHash, function(err, isVerify) {
            if (isVerify) {
                resolve();
            } else {
                return reject(new InvalidPasswordError());
            }
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
