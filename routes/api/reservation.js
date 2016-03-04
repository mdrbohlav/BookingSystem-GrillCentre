var express = require('express');
var router = express.Router();
var configCustom = require('../../config-custom').custom;

var ICalHelper = require('../../helpers/ICalHelper');

var Reservation = require('../../api/reservation');

var InvalidRequestError = require('../../errors/InvalidRequestError');
var MaxReservationUpfrontError = require('../../errors/MaxReservationUpfrontError');
var MaxReservationsError = require('../../errors/MaxReservationsError');
var MaxReservationLengthError = require('../../errors/MaxReservationLengthError');

// POST /api/reservation/create
router.post('/create', function(req, res, next) {
    if (req.body['accessories[]'] && req.body.onlyMobileGrill) {
        next(new InvalidRequestError('Cannot add accessories when booking standalone mobile grill!'));
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

    if (dateStart > dateUpfront && !req.user.isAdmin) {
        next(new MaxReservationUpfrontError());
    }

    if (dateEndMs - dateStartMs > configCustom.MAX_RESERVATION_LENGTH * MS_PER_DAY && !req.user.isAdmin) {
        next(new MaxReservationLengthError());
    }

    var options = {
        where: {
            state: 'draft',
            $or: [{
                $and: [
                    { from: { $gte: dateStartString } },
                    { from: { $lte: dateEndString } }
                ]
            }, {
                $and: [
                    { to: { $gte: dateStartString } },
                    { to: { $lte: dateEndString } }
                ]
            }]
        }
    };

    Reservation.count(options).then(function(countReservations) {
        if (countReservations >= configCustom.MAX_PRERESERVATIONS_DAY && !req.user.isAdmin) {
            next(new MaxReservationsError());
        }

        delete options.where.$and;
        options.where.from = { gte: today };
        options.where.state = 'confirmed';
        options.where.userId = req.user.id;

        return Reservation.count(options).then(function(countUserReservations) {
            if (countUserReservations >= configCustom.MAX_RESERVATIONS_USER && !req.user.isAdmin) {
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

            if (req.body.mobileGrill) {
                data.mobileGrill = true;
            }
            if (req.body.onlyMobileGrill) {
                data.onlyMobileGrill = req.body.onlyMobileGrill;
            } else if (req.body['accessories[]']) {
                accessories = req.body['accessories[]'];

                for (var i = 0; i < accessories.length; i++) {
                    accessories[i] = parseInt(accessories[i]);
                }
            }

            return Reservation.create(req, data, accessories).then(function(result) {
                var id = result.id,
                    start = new Date(result.from),
                    summary = req.user.fullName + ' reservation ' + result.state,
                    description = 'Key pickup time: ' + Math.floor(result.pickup/60) + ':' + result.pickup%60,
                    organizer = req.user.fullName + ' <' + req.user.email + '>';
                ICalHelper.createEvent(id, start, summary, description, organizer);
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
    var options = {
            where: {}
        },
        startInterval,
        endInterval;

    startInterval = req.query.from ? new Date(decodeURIComponent(req.query.from)) : new Date(),
        endInterval = req.query.to ? new Date(decodeURIComponent(req.query.to)) : new Date();

    if (startInterval.toString() === 'Invalid Date' || endInterval.toString() === 'Invalid Date') {
        next(new InvalidRequestError('Invalid date format!'));
    }

    startInterval.setUTCHours(0, 0, 0, 0);
    endInterval.setUTCHours(23, 59, 59, 999);
    options.where.$and = [
        { from: { $gte: startInterval } },
        { from: { $lte: endInterval } }
    ];
    if (req.query.state) {
        options.where.state = req.query.state;
    }

    if (req.query.orderBy && req.query.order) {
        options.order = [
            [req.query.orderBy, req.query.order]
        ];
    }

    Reservation.get(options).then(function(result) {
        res.json(result);
    }).catch(function(data) {
        console.log(data);
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
