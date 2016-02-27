var express = require('express');
var router = express.Router();
var config = require('../config');

var User = require('../api/user');

// GET /user/history
router.get('/history', function(req, res, next) {
    req.query.from = new Date();
    var to = new Date();
    to.setDate(to.getDate() + config.MAX_RESERVATION_UPFRONT);
    req.query.to = to;
    var id = req.user.id,
        where = {};

    User.getReservations(id, where).then(function(result) {
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
