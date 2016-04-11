var express = require('express'),
    router = express.Router();

var GetFile = require(__dirname + '/../../helpers/GetFile'),
    Reservation = require(__dirname + '/../../api/reservation');

var InvalidRequestError = require(__dirname + '/../../errors/InvalidRequestError'),
    MaxReservationUpfrontError = require(__dirname + '/../../errors/MaxReservationUpfrontError'),
    MaxReservationsError = require(__dirname + '/../../errors/MaxReservationsError'),
    MaxReservationLengthError = require(__dirname + '/../../errors/MaxReservationLengthError'),
    UnauthorizedError = require(__dirname + '/../../errors/UnauthorizedError');

// POST /api/reservation/create
router.post('/create', function(req, res, next) {
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom;

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
                    { from: { $lte: dateStartString } },
                    { to: { $gte: dateStartString } }
                ]
            }, {
                $and: [
                    { from: { $lte: dateEndString } },
                    { to: { $gte: dateEndString } }
                ]
            }, {
                $and: [
                    { from: { $gte: dateStartString } },
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
        delete options.where.state;
        options.where.from = { gte: today };
        options.where.$or = [
            { state: 'draft' },
            { state: 'confirmed' }
        ];
        options.where.userId = req.user.id;

        return Reservation.count(options).then(function(countUserReservations) {
            if (countUserReservations >= configCustom.MAX_RESERVATIONS_USER && !req.user.isAdmin) {
                next(new MaxReservationsError(true));
            }

            var data = {
                    from: dateStartString,
                    to: dateEndString,
                    pickup: parseInt(req.body.pickup),
                    userId: req.user.id
                },
                accessories = [];

            if (req.body.comment) {
                data.comment = req.body.comment;
            }
            if (req.body.mobileGrill) {
                data.mobileGrill = req.body.mobileGrill;
            }
            if (req.body.onlyMobileGrill) {
                data.onlyMobileGrill = req.body.onlyMobileGrill;
            } else if (req.body['accessories[]']) {
                accessories = [];

                for (var i = 0; i < req.body['accessories[]'].length; i++) {
                    accessories.push(parseInt(req.body['accessories[]'][i]));
                }
            }

            return Reservation.create(req, data, accessories).then(function(result) {
                res.json(result);
            });
        });
    }).catch(function(data) {
        console.log(data);
        if ('errors' in data) {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        } else if ('status' in data) {
            if (data.customMessage instanceof Array) {
                data.customMessage = data.customeMessage[0];
            }
            next(data);
        } else {
            next(new InvalidRequestError(data));
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

    startInterval = req.query.from ? new Date(decodeURIComponent(req.query.from)) : new Date();
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

    Reservation.get(options, req.user.isAdmin).then(function(result) {
        res.json(result);
    }).catch(function(data) {
        console.log(data);
        if ('errors' in data) {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        } else if ('status' in data) {
            if (data.customMessage instanceof Array) {
                data.customMessage = data.customeMessage[0];
            }
            next(data);
        } else {
            next(new InvalidRequestError(data));
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
        console.log(data);
        if ('errors' in data) {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        } else if ('status' in data) {
            if (data.customMessage instanceof Array) {
                data.customMessage = data.customeMessage[0];
            }
            next(data);
        } else {
            next(new InvalidRequestError(data));
        }
    });
});

// PUT /api/reservation/:id/cancel
router.put('/:id/cancel', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'canceled',
            stateChangedBy: req.user.id
        };

    Reservation.getById(id).then(function(reservation) {
        if (reservation.userId !== req.user.id) {
            throw new UnauthorizedError();
        }

        return Reservation.update(id, data).then(function(count) {
            res.json(count);
        });
    }).catch(function(data) {
        console.log(data);
        if ('errors' in data) {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        } else if ('status' in data) {
            if (data.customMessage instanceof Array) {
                data.customMessage = data.customeMessage[0];
            }
            next(data);
        } else {
            next(new InvalidRequestError(data));
        }
    });
});

module.exports = router;
