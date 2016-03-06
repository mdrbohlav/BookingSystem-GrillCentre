var express = require('express'),
    router = express.Router(),
    configCustom = require(__dirname + '/../config/app').custom;

var User = require(__dirname + '/../api/user');

var InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError');

var title = 'Gril centrum SiliconHill',
    description = 'Rezervační systém pro grilovací centrum na strahovských kolejích u bloku 11.';

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
                title: 'Historie | ' + title,
                description: description,
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
