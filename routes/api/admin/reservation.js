var express = require('express'),
    router = express.Router();

var AuthHelper = require(__dirname + '/../../../helpers/AuthHelper'),
    Reservation = require(__dirname + '/../../../api/reservation');

var InvalidRequestError = require(__dirname + '/../../../errors/InvalidRequestError'),
    ReservationExistsError = require(__dirname + '/../../../errors/ReservationExistsError');

// PUT /api/admin/reservation/:id/confirm
router.put('/:id/confirm', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'confirmed'
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
            return Reservation.update(id, data);
        });
    }).then(function(count) {
        res.json(count);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
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
        res.json(count);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// POST /api/admin/reservation/:id/rating
router.post('/:id/rating', function(req, res, next) {
    var data = {
        reservationId: req.params.id,
        userId: req.body.userId,
        value: req.body.value,
        ratedBy: req.user.id
    };
    if (req.body.comment) {
        data.comment = req.body.comment;
    }

    Reservation.rate(data).then(function(created) {
        res.json(created);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

module.exports = router;
