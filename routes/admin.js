var express = require('express'),
    fs = require('fs'),
    router = express.Router(),
    configCustom = require('../config-custom').custom;

var Reservation = require('../api/reservation');

var InvalidRequestError = require('../errors/InvalidRequestError');

function getFile(filename) {
    var data = fs.readFileSync(filename, {
        encoding: 'utf8'
    });
    return data;
}

// GET /admin/reservations
router.get('/reservations', function(req, res, next) {
    var options = {
        order: [ [ 'priority', 'DESC' ], [ 'from', 'DESC' ], [ 'to', 'DESC' ] ],
    };

    if (req.query.month) {
        var date = new Date(parseInt(req.query.month)),
            y = date.getFullYear(),
            m = date.getMonth();
        var firstDay = new Date(y, m, 1);
        var lastDay = new Date(y, m + 1, 0);
        firstDay.setUTCHours(0, 0, 0, 0);
        lastDay.setUTCHours(23, 59, 59, 999);

        options.where = {
            $or: [{
                $and: [
                    { from: { $gte: firstDay } },
                    { from: { $lte: lastDay } }
                ]
            }, {
                $and: [
                    { to: { $gte: firstDay } },
                    { to: { $lte: lastDay } }
                ]
            }]
        };
    } else {
        var date = new Date(),
            y = date.getFullYear(),
            m = date.getMonth();
        var firstDay = new Date(y, m, 1);
        var lastDay = new Date(y, m + 1, 0);
        firstDay.setUTCHours(0, 0, 0, 0);
        lastDay.setUTCHours(23, 59, 59, 999);

        var today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        options.where = {
            $or: [{
                $and: [
                    { from: { $gte: firstDay } },
                    { from: { $lte: lastDay } }
                ]
            }, {
                $and: [
                    { to: { $gte: firstDay } },
                    { to: { $lte: lastDay } }
                ]
            }, {
                from: { $gte: today },
                state: 'draft'
            }]
        };
    }

    Reservation.get(options).then(function(result) {
        if (req.query.accept && req.query.accept === 'json') {
            res.json(result);
        } else {
            res.render('reservations', {
                page: 'reservations',
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

// GET /admin/statistics
router.get('/statistics', function(req, res, next) {
    var options = {
            where: {}
        },
        startInterval,
        endInterval;

    var date = new Date(),
        y = date.getFullYear(),
        m = date.getMonth();
    var firstDay = new Date(y, m, 1);
    var lastDay = new Date(y, m + 1, 0);
    firstDay.setUTCHours(0, 0, 0, 0);
    lastDay.setUTCHours(23, 59, 59, 999);

    var startInterval = req.query.from ? new Date(decodeURIComponent(req.query.from)) : new Date(),
        endInterval = req.query.to ? new Date(decodeURIComponent(req.query.to)) : new Date();

    if (startInterval.toString() === 'Invalid Date' || endInterval.toString() === 'Invalid Date') {
        next(new InvalidRequestError('Invalid date format!'));
    }

    startInterval.setUTCHours(0, 0, 0, 0);
    endInterval.setUTCHours(23, 59, 59, 999);
    options.where = {
        $or: [{
            $and: [
                { from: { $gte: startInterval } },
                { from: { $lte: endInterval } }
            ]
        }, {
            $and: [
                { to: { $gte: startInterval } },
                { to: { $lte: endInterval } }
            ]
        }]
    };

    Reservation.get(options).then(function(result) {
        res.render('statistics', {
            page: 'statistics',
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

// GET /admin/config
router.get('/config', function(req, res, next) {
    var fileData = getFile('./config-custom.js'),
        configKeys = {
            emails: {
                name: 'Emaily',
                fields: {
                    CONFIRM_RESERVATION_HEADING: {
                        name: 'Nadpis potvrzené rezervace',
                        type: 'text'
                    },
                    DRAFT_RESERVATION_HEADING: {
                        name: 'Nadpis předrezervace',
                        type: 'text'
                    },
                    SEND_EMAILS: {
                        name: 'Posílat emaily',
                        type: 'checkbox'
                    }
                }
            },
            reservations: {
                name: 'Rezervace',
                fields: {
                    MAX_PRERESERVATIONS_DAY: {
                        name: 'Maximální počet předrezervací na den',
                        type: 'tel'
                    },
                    MAX_RESERVATIONS_USER: {
                        name: 'Maximální počet rezervací na uživatele',
                        type: 'tel'
                    },
                    MAX_RESERVATION_LENGTH: {
                        name: 'Maximální délka rezervace [dny]',
                        type: 'tel'
                    },
                    MAX_RESERVATION_UPFRONT: {
                        name: 'Rezervace dopředu [dny]',
                        type: 'tel'
                    }
                }
            },
            pickup: {
                name: 'Vyzvednutí klíčů',
                fields: {
                    KEY_PICKUP_FROM: {
                        name: 'Minimální čas',
                        type: 'time'
                    },
                    KEY_PICKUP_TO: {
                        name: 'Maximální čas',
                        type: 'time'
                    },
                    KEY_PICKUP_INTERVAL_MINS: {
                        name: 'Interval [minuty]',
                        type: 'tel'
                    }
                }
            }
        };
    fileData = fileData.replace(/^module\.exports = /, '').replace(/;\n$/, '').replace(/\s\s+/g, ' \"').replace(/:/g, "\":").replace(/'/g, "\"").replace(/\"}/g, '}');
    res.render('config', {
        page: 'config',
        configKeys: configKeys,
        fileData: JSON.parse(fileData)
    });
});

module.exports = router;
