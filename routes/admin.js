var express = require('express'),
    fs = require('fs'),
    router = express.Router(),
    configFileName = 'config/app',
    configCustom = require(__dirname + '/../config/app').custom;

var Reservation = require(__dirname + '/../api/reservation'),
    User = require(__dirname + '/../api/user'),
    Accessory = require(__dirname + '/../api/accessory');

var InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError');

var title = 'Gril centrum SiliconHill',
    description = 'Rezervační systém pro grilovací centrum na strahovských kolejích u bloku 11.';

function getFile(filename) {
    var data = fs.readFileSync(filename, {
        encoding: 'utf8'
    });
    return data;
}

// GET /admin/reservations
router.get('/reservations', function(req, res, next) {
    var options = {
        order: [ 
            ['createdAt', 'ASC']
        ],
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
                title: 'Rezervace | ' + title,
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

// GET /admin/accessories
router.get('/accessories', function(req, res, next) {
    Accessory.get().then(function(result) {
        res.render('accessories', {
            page: 'accessories',
            title: 'Příslušenství | '  + title,
            description: description,
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

// GET /admin/users
router.get('/users', function(req, res, next) {
    var options = {
        where: {}
    };
    if (req.query.search) {
        var tmp = req.query.search.split(' ');
        options.where = {
            $or: [{
                firstname: {
                    $any: tmp
                }
            }, {
                lastname: {
                    $any: tmp
                }
            }, {
                email: {
                    $any: tmp
                }
            }]
        };
        for (var i = 0; i < tmp.length; i++) {
            if (/^[0-9]+$/.test(tmp[i])) {
                if (options.where.$or.length === 3) {
                    options.where.$or.push({
                        isId: {
                            $any: []
                        }
                    });
                }
                options.where.$or[3].isId.$any.push(parseInt(tmp[i]));
            }
        }
    }
    if (req.query.isId) {
        options.where.isId = req.query.isId === 'true' ? { $ne: null } : null;
    }
    if (req.query.ban) {
        options.where.banned = req.query.ban === 'true' ? true : false;
    }
    if (req.query.block) {
        options.where.block = parseInt(req.query.block);
    }
    User.get(options).then(function(result) {
        console.log(result);
        if (req.query.accept && req.query.accept === 'json') {
            res.json(result);
        } else {
            res.render('users', {
                page: 'users',
                title: 'Uživatelé | '  + title,
                description: description,
                data: result
            });
        }
    }).catch(function(data) {
        console.log(data);
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
            title: 'Statistiky | '  + title,
            description: description,
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
    var fileData = getFile('./' + configFileName + '.js'),
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
    fileData = JSON.parse(fileData.replace(/^module\.exports = /, '').replace(/;\n$/, ''));
    res.render('config', {
        page: 'config',
        title: 'Nastavení | ' + title,
        description: description,
        configKeys: configKeys,
        fileData: fileData
    });
});

// PUT /admin/config
router.put('/config', function(req, res, next) {
    var fileData = getFile('./' + configFileName + '.js');
    fileData = JSON.parse(fileData.replace(/^module\.exports = /, '').replace(/;\n$/, ''));
    for (var k in req.body) {
        if (['tel', 'time'].indexOf(fileData.default[k].type) > -1) {
            fileData.custom[k] = parseInt(req.body[k]);
        } else if (fileData.default[k].type === 'checkbox') {
            fileData.custom[k] = req.body[k] === 'true' ? true : false;
        } else {
            fileData.custom[k] = req.body[k];
        }
    }
    fileData = JSON.stringify(fileData, null, 4).replace(/^/, 'module.exports = ').replace(/$/, ';\n');
    fs.writeFileSync('./' + configFileName + '.js', fileData);
    res.json({ success: true });
});

module.exports = router;
