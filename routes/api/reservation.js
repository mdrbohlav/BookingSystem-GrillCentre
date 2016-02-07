var express = require('express');
var router = express.Router();
var config = require('../../config');

var InvalidRequestError = require('../../errors/InvalidRequestError');

var Reservation = require('../../models').Reservation;
var Rating = require('../../models').Rating;

// POST /api/reservation/create
router.post('/create', function(req, res, next) {
    var data = {
        from: req.body.from,
        to: req.body.to,
        userId: req.body.userId,
        priority: req.body.priority
    };
    Reservation.create(data).then(function(reservation) {
        res.json(reservation.get({
            plain: true
        }));
    }).catch(function(data) {
        return next(new InvalidRequestError(data.errors));
    });
});

// GET /api/reservation/:id
router.get('/:id', function(req, res, next) {
    Reservation.findById(req.params.id).then(function(reservation) {
        reservation.getRating().then(function(rating) {
            reservation = reservation.get({
                plain: true
            });
            reservation.rating = rating;
            res.json(reservation);
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
    }).spread(function(affectedRows) {
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
    }).spread(function(affectedRows) {
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
