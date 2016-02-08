var express = require('express');
var router = express.Router();
var config = require('../../config');

var InvalidRequestError = require('../../errors/InvalidRequestError');

var Reservation = require('../../models').Reservation;
var Rating = require('../../models').Rating;
var Accessory = require('../../models').Accessory;

// POST /api/reservation/create
router.post('/create', function(req, res, next) {
    var data = {
            from: req.body.from,
            to: req.body.to,
            userId: req.body.userId,
            priority: req.body.priority
        },
        accessories = req.body.accessories;
    Reservation.create(data).then(function(reservation) {
        var unsavedAccessories = accessories.length,
            result = reservation.get({
                plain: true
            });
        result.accessory = [];
        if (unsavedAccessories === 0) {
            res.json(result);
        } else {
            Accessory.findAll({ 
                where: {
                    id: {
                        $any: accessories
                    }
                }
            }).then(function(data) {
                for (var i = 0; i < data.length; i++) {
                    result.accessory.push(data[i].get({
                        plain: true
                    }));
                }
                reservation.addAccessory(data).then(function(response) {
                    res.json(result);
                }).catch(function(data) {
                    return next(new InvalidRequestError('Cannot set associations between reservation and accessories.'));
                });
            }).catch(function(data) {
                return next(new InvalidRequestError('Cannot find specified accessories.'));
            });
        }
    }).catch(function(data) {
        return next(new InvalidRequestError(data.errors));
    });
});

// GET /api/reservation/:id
router.get('/:id', function(req, res, next) {
    Reservation.findById(req.params.id).then(function(reservation) {
        reservation.getRating().then(function(rating) {
            reservation.getAccessories().then(function(data) {
                reservation = reservation.get({
                    plain: true
                });
                reservation.rating = rating;
                reservation.accessory = [];
                for (var i = 0; i < data.length; i++) {
                    reservation.accessory.push(data[i].get({
                        plain: true
                    }));
                }
                res.json(reservation);
            }).catch(function(data) {
                return next(new InvalidRequestError('Cannot get accessories for the reservation.'));
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('Cannot get rating for the reservation.'));
        });
    }).catch(function(data) {
        return next(new InvalidRequestError('This reservation does not exist.'));
    });
});

// POST /api/reservation/:id/confirm
router.post('/:id/confirm', function(req, res, next) {
    var data = {
        state: 'confirmed'
    };
    Reservation.update(data, {
        where: {
            id: req.params.id
        }
    }).then(function(affectedRows) {
        // TODO: send email with generated pdf
        res.json({
            success: true,
            affectedRows: affectedRows
        });
    }).catch(function(data) {
        return next(new InvalidRequestError(data.errors));
    });
});

// POST /api/reservation/:id/reject
router.post('/:id/reject', function(req, res, next) {
    var data = {
        state: 'rejected'
    };
    Reservation.update(data, {
        where: {
            id: req.params.id
        }
    }).then(function(affectedRows) {
        // TODO: send email
        res.json({
            success: true,
            affectedRows: affectedRows
        });
    }).catch(function(data) {
        return next(new InvalidRequestError(data.errors));
    });
});

// POST /api/reservation/:id/rating
router.post('/:id/rating', function(req, res, next) {
    var data = {
        reservationId: req.params.id,
        userId: req.body.userId,
        value: req.body.value
    };
    if (req.body.comment) {
        data.comment = req.body.comment;
    }
    Rating.upsert(data).then(function(created) {
        res.json({
            success: true,
            created: created
        });
    }).catch(function(data) {
        return next(new InvalidRequestError(data.errors));
    });
});

module.exports = router;
