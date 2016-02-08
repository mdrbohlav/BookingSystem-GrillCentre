var express = require('express');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();
var config = require('../../config');

var AuthHelper = require('../../helpers/AuthHelper');

var EmailExistsError = require('../../errors/EmailExistsError');
var InvalidRequestError = require('../../errors/InvalidRequestError');

var User = require('../../models').User;

// POST /api/user/create
router.post('/create', function(req, res, next) {
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

// PUT /api/user/:id
function processUserUpdate(req, res, next, passwordHash) {
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
    if (req.body.isAdmin) {
        data.isAdmin = req.body.isAdmin;
    }
    User.update(data, {
        where: {
            id: req.params.id
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

router.put('/:id', function(req, res, next) {
    if (req.body.password) {
        AuthHelper.hashPassword(req.body.password).then(function(passwordHash) {
            processUserUpdate(req, res, next, passwordHash);
        });
    } else {
        processUserUpdate(req, res, next);
    }
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
