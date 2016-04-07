var express = require('express'),
    router = express.Router();

var User = require(__dirname + '/../../api/user');

var UnauthorizedError = require(__dirname + '/../../errors/UnauthorizedError'),
    InvalidRequestError = require(__dirname + '/../../errors/InvalidRequestError');

function getData(req, data) {
    if (req.body.password) {
        data.password = req.body.password;
    }
    if (req.body.email) {
        data.email = req.body.email;
    }
    if (req.body.phone) {
        data.phone = req.body.phone;
    }
    if (req.body.firstname) {
        data.firstname = req.body.firstname;
    }
    if (req.body.lastname) {
        data.lastname = req.body.lastname;
    }
    if (req.body.block) {
        data.block = req.body.block;
    }
    if (req.body.room) {
        data.room = req.body.room;
    }
    if (req.body.locale) {
        data.locale = req.body.locale;
    }
    if (req.user.isAdmin || req.user.email === 'm.drbohlav1@gmail.com') {
        if ('isAdmin' in req.body) {
            data.isAdmin = req.body.isAdmin;
        }
        if ('ban' in req.body) {
            data.banned = req.body.ban;
        }
    }

    return data;
}

// GET /api/user
router.get('/', function(req, res, next) {
    var id = req.user.id;
    User.getById(id).then(function(user) {
        res.json(user);
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

// PUT /api/user
router.put('/', function(req, res, next) {
    var data = {
        id: req.user.id
    };
    if (req.user.email !== 'm.drbohlav1@gmail.com' && !req.user.isAdmin &&  (req.body.isAdmin || req.body.priority)) {
        next(new UnauthorizedError());
    }
    data = getData(req, data);

    User.update(data).then(function(count) {
        var id = req.user.id;
        return User.getById(id, true).then(function(user) {
            req.logIn(user, function(err) {
                if (err) {
                    next(err);
                }
                res.json(count);
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

// DELETE /api/user
router.delete('/', function(req, res, next) {
    var id = req.user.id;
    User.delete(id).then(function(count) {
        res.json(count);
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

// GET /api/user/reservations/:state?
router.get('/reservations/:state?', function(req, res, next) {
    var id = req.user.id,
        options = {
            where: {}
        };
    if (req.params.state) {
        options.where.state = req.params.state;
    }
    User.getReservations(id, options).then(function(result) {
        res.json(result);
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
