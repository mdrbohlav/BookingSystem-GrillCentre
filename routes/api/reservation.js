// # Rezervace
var express = require('express'),
    router = express.Router();

// [Helper pro načtení souboru](../../helpers/GetFile.html)
var GetFile = require(__dirname + '/../../helpers/GetFile'),
    // [API pro rezervace](../../api/reservation.html)
    Reservation = require(__dirname + '/../../api/reservation');

var InvalidRequestError = require(__dirname + '/../../errors/InvalidRequestError'),
    MaxReservationUpfrontError = require(__dirname + '/../../errors/MaxReservationUpfrontError'),
    MaxReservationsError = require(__dirname + '/../../errors/MaxReservationsError'),
    MaxReservationLengthError = require(__dirname + '/../../errors/MaxReservationLengthError'),
    UnauthorizedError = require(__dirname + '/../../errors/UnauthorizedError');

// ## Vytvoření
// `POST /api/reservation/create`
router.post('/create', function(req, res, next) {
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom;

    // Pokud rezervace pouze mobilního grilu a příslušenství, vrátit chybu `InvalidRequestError`.
    if (req.body['accessories[]'] && req.body.onlyMobileGrill) {
        res.send(new InvalidRequestError('Cannot add accessories when booking standalone mobile grill!'));
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

    // Pokud datum začátku rezervace přesahuje datum po který lze provést rezervaci dopředu
    // a zároveň rezervaci neprovádí admin, vrátit chybu `MaxReservationUpfrontError`.
    if (dateStart > dateUpfront && !req.user.isAdmin) {
        res.send(new MaxReservationUpfrontError());
    }

    // Pokud délka rezervace přesahuje maximální délku rezervace a rezervaci neprovádí admin,
    // vrátit chybu `MaxReservationLengthError`.
    if (dateEndMs - dateStartMs > configCustom.MAX_RESERVATION_LENGTH * MS_PER_DAY && !req.user.isAdmin) {
        res.send(new MaxReservationLengthError());
    }

    // Nastavení pro dotaz na počet předrezervací na daný termín.
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

    // Dotaz na počet předrezervací na daný termín.
    Reservation.count(options).then(function(countReservations) {
        // Pokud počet předrezrvací je větší nebo roven maximu a rezervaci neprovádí admin,
        // vrátit chybu `MaxReservationsError`.
        if (countReservations >= configCustom.MAX_PRERESERVATIONS_DAY && !req.user.isAdmin) {
            throw new MaxReservationsError();
        }

        // Úprava nastavení pro dotaz na počet předrezervací a potvrzených rezrvací uživatele.
        delete options.where.$and;
        delete options.where.state;
        options.where.from = { gte: today };
        options.where.$or = [
            { state: 'draft' },
            { state: 'confirmed' }
        ];
        options.where.userId = req.user.id;

        // Dotaz na počet předrezdrvací a počet potvrzených rezervací uživatele.
        return Reservation.count(options).then(function(countUserReservations) {
            // Pokud je větší jak maximum a nejedná se o admina, vrátit chybu `MaxReservationsError`.
            if (countUserReservations >= configCustom.MAX_RESERVATIONS_USER && !req.user.isAdmin) {
                throw new MaxReservationsError(true);
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

            // Vytvoření rezervace v databázi.
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

// ## Získání všech rezervací
// `GET /api/reservation`
router.get('/', function(req, res, next) {
    var options = {
            where: {}
        },
        startInterval,
        endInterval;

    // Nastavení intervalu, ve kterém chceme získat všechny rezervace.
    startInterval = req.query.from ? new Date(decodeURIComponent(req.query.from)) : new Date();
    endInterval = req.query.to ? new Date(decodeURIComponent(req.query.to)) : new Date();

    // Pokud byl zadán špatný formát data, vrátit chybu `InvalidRequestError`.
    if (startInterval.toString() === 'Invalid Date' || endInterval.toString() === 'Invalid Date') {
        res.send(new InvalidRequestError('Invalid date format!'));
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

// ## Získání konkrétní rezervace
// `GET /api/reservation/:id`
router.get('/:id', function(req, res, next) {
    var id = req.params.id;
    Reservation.getById(id).then(function(reservation) {
        if (!req.user.isAdmin && reservation.userId !== req.user.id) {
            res.send(new InvalidRequestError());
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

// ## Zrušení rezervace
// `PUT /api/reservation/:id/cancel`
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

// ## Exportování routeru
module.exports = router;
