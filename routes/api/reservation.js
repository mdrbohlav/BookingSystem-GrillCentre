var express = require('express');
var router = express.Router();
var configCustom = require('../../config-custom').custom;

var Reservation = require('../../api/reservation');

var InvalidRequestError = require('../../errors/InvalidRequestError');
var MaxReservationUpfrontError = require('../../errors/MaxReservationUpfrontError');
var MaxReservationsError = require('../../errors/MaxReservationsError');
var MaxReservationLengthError = require('../../errors/MaxReservationLengthError');

// POST /api/reservation/create
router.post('/create', function(req, res, next) {
    if (req.body['accessories[]'] && req.body.separateGrill) {
        next(new InvalidRequestError('Cannot add accessories when booking separate grill!'));
    }

    var dateUpfront = new Date(),
        today = new Date(),
        dateStart = new Date(req.body.from),
        dateEnd = new Date(req.body.to),
        MS_PER_DAY = 1000 * 60 * 60 * 24;

    dateUpfront.setDate(dateUpfront.getDate() + configCustom.MAX_RESERVATION_UPFRONT);

    today.setUTCHours(0, 0, 0, 0);
    dateStart.setUTCHours(0, 0, 0, 0);
    dateEnd.setUTCHours(23, 59, 59, 999);

    today = today.toISOString();
    dateStartString = dateStart.toISOString();
    dateEndString = dateEnd.toISOString();

    dateStartMs = dateStart.getTime();
    dateEndMs = dateEnd.getTime();

    if (dateStart > dateUpfront) {
        next(new MaxReservationUpfrontError());
    }

    if (dateEndMs - dateStartMs > configCustom.MAX_RESERVATION_LENGTH * MS_PER_DAY) {
        next(new MaxReservationLengthError());
    }

    var options = {
        where: {
            state: 'draft',
            $and: [
                { from: { $gte: dateStartString } },
                { from: { $lte: dateEndString } }
            ]
        }
    };

    Reservation.count(options).then(function(countReservations) {
        if (countReservations >= configCustom.MAX_PRERESERVATIONS_DAY) {
            next(new MaxReservationsError());
        }

        delete options.where.$and;
        options.where.from = { gte: today };
        options.where.state = 'confirmed';
        options.where.userId = req.user.id;

        return Reservation.count(options).then(function(countUserReservations) {
            if (countUserReservations >= configCustom.MAX_RESERVATIONS_USER) {
                next(new MaxReservationsError(true));
            }

            var data = {
                    from: dateStartString,
                    to: dateEndString,
                    pickup: parseInt(req.body.pickup),
                    userId: req.user.id,
                    priority: req.user.priority
                },
                accessories = [];

            if (req.body.separateGrill) {
                data.separateGrill = true;
            }
            if (req.body.onlySeparateGrill) {
                data.onlySeparateGrill = req.body.onlySeparateGrill;
            } else if (req.body['accessories[]']) {
                accessories = req.body['accessories[]'];

                for (var i = 0; i < accessories.length; i++) {
                    accessories[i] = parseInt(accessories[i]);
                }
            }

            return Reservation.create(req, data, accessories).then(function(result) {
                res.json(result);
            });
        });
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// GET /api/reservation
router.get('/', function(req, res, next) {
    var where = {},
        startInterval,
        endInterval;

    startInterval = req.query.from ? new Date(decodeURIComponent(req.query.from)) : new Date(),
    endInterval = req.query.to ? new Date(decodeURIComponent(req.query.to)) : new Date();

    if (startInterval.toString() === 'Invalid Date' || endInterval.toString() === 'Invalid Date') {
        next(new InvalidRequestError('Invalid date format!'));
    }

    startInterval.setUTCHours(0, 0, 0, 0);
    endInterval.setUTCHours(23, 59, 59, 999);
    where.$and = [
        { from: { $gte: startInterval } },
        { from: { $lte: endInterval } }
    ];
    if (req.params.state) {
        where.state = req.params.state;
    }

    Reservation.get(where).then(function(result) {
        res.json(result);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// GET /api/reservation/:id
router.get('/:id', function(req, res, next) {
    var id = req.params.id;
    Reservation.getById(id).then(function(reservation) {
        if (!req.user.isAdmin && reservation.userId !== req.user.id) {
            next(new InvalidRequestError());
        }
        res.json(reservation);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// PUT /api/reservation/:id/cancel
router.put('/:id/cancel', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'canceled'
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

module.exports = router;
