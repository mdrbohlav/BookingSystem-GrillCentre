var express = require('express'),
    router = express.Router(),
    configCustom = require('../config-custom').custom;

var User = require('../api/user');

var InvalidRequestError = require('../errors/InvalidRequestError');

// GET /user/history
router.get('/history', function(req, res, next) {
    req.query.from = new Date();
    var to = new Date();
    to.setDate(to.getDate() + configCustom.MAX_RESERVATION_UPFRONT);
    req.query.to = to;
    var id = req.user.id,
        options = {
            order: [ 
                ['from', 'DESC'],
                ['to', 'DESC']
            ],
            limit: 20,
            offset: 0
        };

    if (req.query.limit) {
        options.limit = req.query.limit;
    }
    if (req.query.offset) {
        options.offset = req.query.offset;
    }

    User.getReservations(id, options).then(function(result) {
        result.pagination = {
            limit: options.limit,
            offset: options.offset
        };
        if (req.query.accept && req.query.accept === 'json') {
            res.json(result);
        } else {
            res.render('history', {
                page: 'history',
                data: result
            });
        }
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

module.exports = router;
