var express = require('express'),
    router = express.Router();

var GetFile = require(__dirname + '/../helpers/GetFile'),
    User = require(__dirname + '/../api/user');

var InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError');

// GET /user/history
router.get('/history', function(req, res, next) {
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom;
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
        if (req.query.accept &&  req.query.accept === 'json') {
            res.json(result);
        } else {
            res.render('history', {
                page: 'history',
                title: req.i18n.__('titles_1') + ' | ' + req.i18n.__('title'),
                description: req.i18n.__('description'),
                data: result
            });
        }
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

// GET /user/update-locale/:locale/:returnUrl
router.get('/update-locale/:locale/:returnUrl', function(req, res, next) {
    var locale = req.params.locale,
        returnUrl = decodeURIComponent(req.params.returnUrl),
        data = {
            id: req.user.id,
            locale: locale
        };
    User.update(data).then(function(count) {
        return User.getById(data.id, true).then(function(user) {
            req.logIn(user, function(err) {
                if (err) {
                    next(err);
                }
                res.redirect(returnUrl);
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

module.exports = router;
