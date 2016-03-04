var express = require('express');
var router = express.Router();
var configCustom = require('../config-custom').custom;

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
            order: [ 'from' ]
        };

    User.getReservations(id, options).then(function(result) {
        res.render('history', {
            page: 'history',
            data: result
        });
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

module.exports = router;
