// # Rezervace
var express = require('express'),
    router = express.Router();

// [Helper pro autentizaci](../../../helpers/AuthHelper.html)
var AuthHelper = require(__dirname + '/../../../helpers/AuthHelper'),
    // [API pro rezervace](../../../api/reservation.html)
    Reservation = require(__dirname + '/../../../api/reservation'),
    // [API pro uživatele](../../../api/user.html)
    User = require(__dirname + '/../../../api/user');

var InvalidRequestError = require(__dirname + '/../../../errors/InvalidRequestError'),
    ReservationExistsError = require(__dirname + '/../../../errors/ReservationExistsError');

// ## Potvrzení
// `PUT /api/admin/reservation/:id/confirm`
router.put('/:id/confirm', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'confirmed',
            stateChangedBy: req.user.id
        },
        options;
    // Dotaz na rezervaci podle id.
    Reservation.getById(id).then(function(reservation) {
        // Nastavení voleb pro dotaz na existenci potvrzené rezervace na daný termín.
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
                }, {
                    $and: [
                        { from: { $gte: reservation.from } },
                        { to: { $lte: reservation.to } }
                    ]
                }]
            }
        };

        if (!reservation.onlyMobileGrill) {
            options.where.onlyMobileGrill = false;
        } else {
            options.where.mobileGrill = true;
        }

        // Dotaz na počet existujících potvrzených rezervací na daný termín.
        return Reservation.count(options).then(function(count) {
            // Pokud rezervace existuje, vrátit chybu `ReservationExistsError`.
            if (count > 0) {
                throw new ReservationExistsError();
            }
            // Jinak potvrzení rezervace.
            return Reservation.update(id, data, req);
        });
    }).then(function(count) {
        res.json(count);
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

// ## Zamítnutí
// `PUT /api/admin/reservation/:id/reject`
router.put('/:id/reject', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'rejected',
            stateChangedBy: req.user.id
        };
    if (req.body.rejectionComment) {
        data.rejectReason = req.body.rejectionComment;
    }
    Reservation.update(id, data).then(function(count) {
        res.json(count);
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

// ## Zrušení
// `PUT /api/admin/reservation/:id/cancel`
router.put('/:id/cancel', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'rejected',
            stateChangedBy: req.user.id
        };
    if (req.body.rejectionComment) {
        data.rejectReason = req.body.rejectionComment;
    }
    Reservation.update(id, data).then(function(count) {
        res.json(count);
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

// ## Hodnocení
// `POST /api/admin/reservation/:id/rating`
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
