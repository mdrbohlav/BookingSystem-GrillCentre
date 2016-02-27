var express = require('express');
var router = express.Router();
var config = require('../../../config');

var AuthHelper = require('../../../helpers/AuthHelper');
var Reservation = require('../../../api/reservation');

var InvalidRequestError = require('../../../errors/InvalidRequestError');

// PUT /api/admin/reservation/:id/confirm
router.put('/:id/confirm', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'confirmed'
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

// PUT /api/admin/reservation/:id/reject
router.put('/:id/reject', function(req, res, next) {
    var id = req.params.id,
        data = {
            state: 'rejected'
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
        value: req.body.value
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
