var express = require('express');
var router = express.Router();
var config = require('../../config');

var AuthHelper = require('../../helpers/AuthHelper');

var InvalidRequestError = require('../../errors/InvalidRequestError');

var Reservation = require('../../models').Reservation;

// GET /api/reservations
router.get('/:state?', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var where = {},
            startInterval,
            endInterval;

        try {
            startInterval = req.query.from ? new Date(decodeURIComponent(req.query.from)) : new Date(),
            endInterval = req.query.to ? new Date(decodeURIComponent(req.query.to)) : new Date();
        } catch(err) {
            return next(new InvalidRequestError('Invalid date format!'));
        }

        startInterval.setUTCHours(0, 0, 0, 0);
        endInterval.setUTCHours(23, 59, 59, 999);
        where.$and = [
            { from: { gte: startInterval } },
            { from: { lte: endInterval } }
        ];
        if (req.params.state) {
            where.state = req.params.state;
        }
        Reservation.findAndCountAll({
            where: where
        }).then(function(data) {
            var reservations = [];
            for (var i = 0; i < data.rows.length; i++) {
                reservations.push(data.rows[i].get({
                    plain: true
                }));
            }
            res.json({
                reservations: reservations,
                total: data.count
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('Something went wrong, please try again.'));
        });
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
