var express = require('express'),
    router = express.Router();

var AuthHelper = require(__dirname + '/../../../helpers/AuthHelper'),
    ICalHelper = require(__dirname + '/../../../helpers/ICalHelper'),
    Reservation = require(__dirname + '/../../../api/reservation'),
    User = require(__dirname + '/../../../api/user');

var InvalidRequestError = require(__dirname + '/../../../errors/InvalidRequestError'),
    ReservationExistsError = require(__dirname + '/../../../errors/ReservationExistsError');

// PUT /api/admin/reservation/:id/confirm
router.put('/:id/confirm', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'confirmed',
            stateChangedBy: req.user.id
        },
        options;
    Reservation.getById(id).then(function(reservation) {
        var options = {
            where: {
                state: 'confirmed',
                stateChangedBy: req.user.id,
                $or: [{
                    $and: [
                        { from: { $lte: reservation.from } },
                        { to: { $gte: reservation.from } }
                    ]
                }, {
                    $and: [
                        { from: { $lte: reservation.to } },
                        { to: { $gte: reservation.to } }
                    ]
                }]
            }
        };

        if (!reservation.onlyMobileGrill) {
            options.where.onlyMobileGrill = false;
        } else {
            options.where.mobileGrill = true;
        }

        return Reservation.count(options).then(function(count) {
            if (count > 0) {
                throw new ReservationExistsError();
            }
            return Reservation.update(id, data, req).then(function(updatedRows) {
                return User.getById(reservation.userId).then(function(user) {
                    var id = reservation.id,
                        start = new Date(reservation.from),
                        summary = user.fullName + ' reservation',
                        description = 'Key pickup time: ' + Math.floor(reservation.pickup / 60) + ':' + reservation.pickup % 60,
                        organizer = user.fullName + ' <' + user.email + '>';
                    ICalHelper.createEvent(id, start, summary, description, organizer);
                    return updatedRows;
                });
            });
        });
    }).then(function(count) {
        res.json(count);
    }).catch(function(data) {
        console.log(data);
        if ('status' in data) {
            next(data);
        } else if ('errors' in data) {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        } else {
            next(data);
        }
    });
});

// PUT /api/admin/reservation/:id/reject
router.put('/:id/reject', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'rejected',
            stateChangedBy: req.user.id
        };
    Reservation.update(id, data).then(function(count) {
        ICalHelper.initCalendar();
        res.json(count);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        }
    });
});

// PUT /api/admin/reservation/:id/cancel
router.put('/:id/cancel', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'canceled',
            stateChangedBy: req.user.id
        };
    Reservation.update(id, data).then(function(count) {
        ICalHelper.initCalendar();
        res.json(count);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        }
    });
});

// POST /api/admin/reservation/:id/rating
router.post('/:id/rating', function(req, res, next) {
    var data = {
        value: req.body.value,
        ratedBy: req.user.id
    };
    if (req.body.comment) {
        data.comment = req.body.comment;
    }

    Reservation.rate(req.params.id, data).then(function(created) {
        res.json(created);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        }
    });
});

module.exports = router;
