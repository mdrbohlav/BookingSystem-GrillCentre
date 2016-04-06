var express = require('express'),
    router = express.Router();

var AuthHelper = require(__dirname + '/../../../helpers/AuthHelper'),
    User = require(__dirname + '/../../../api/user');

var InvalidRequestError = require(__dirname + '/../../../errors/InvalidRequestError'),
    MinimumAdminsError = require(__dirname + '/../../../errors/MinimumAdminsError');

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
    if (req.user.isAdmin) {
        if (req.body.banned) {
            data.banned = req.body.banned === 'true' ? true : false;
        }
        if (req.body.isAdmin) {
            data.isAdmin = req.body.isAdmin;
        }
    }

    return data;
}

// POST /api/admin/user/create
router.post('/create', function(req, res, next) {
    var data = {
        password: req.body.password,
        email: req.body.email,
        phone: req.body.phone,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        locale: req.body.locale
    };
    if ('block' in req.body) {
        data.block = parseInt(req.body.block);
    }
    if ('room' in req.body) {
        data.room = req.body.room;
    }
    if ('isAdmin' in req.body) {
        data.isAdmin = req.body.isAdmin === 'true' ? true : false;
    }
    User.create(data).then(function(user) {
        res.json(user);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        }
    });
});

// GET /api/admin/user/:id
router.get('/:id', function(req, res, next) {
    var id = req.params.id;
    User.getById(id).then(function(user) {
        res.json(user);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        }
    });
});

// PUT /api/admin/user/:id
router.put('/:id', function(req, res, next) {
    var data = {
        id: req.params.id
    };
    data = getData(req, data);

    if ('isAdmin' in data &&  data.isAdmin === 'false') {
        var options = {
            where: {
                isAdmin: true
            }
        };

        User.count(options).then(function(count) {
            if (count < 2) {
                next(new MinimumAdminsError());
            } else {
                return User.update(data).then(function(count) {
                    if (req.user.id === req.params.id) {
                        return User.getById(id).then(function(user) {
                            req.logIn(user, function(err) {
                                if (err) {
                                    next(err);
                                }
                                res.json(count);
                            });
                        });
                    } else {
                        res.json(count);
                    }
                });
            }
        }).catch(function(data) {
            if ('status' in data) {
                next(data);
            } else {
                for (var i = 0; i < data.errors.length; i++) {
                    next(new InvalidRequestError(data.errors[i].message));
                }
            }
        });
    } else {
        User.update(data).then(function(count) {
            if (req.user.id === req.params.id) {
                return User.getById(id).then(function(user) {
                    req.logIn(user, function(err) {
                        if (err) {
                            next(err);
                        }
                        res.json(count);
                    });
                });
            } else {
                res.json(count);
            }
        }).catch(function(data) {
            if ('status' in data) {
                next(data);
            } else {
                for (var i = 0; i < data.errors.length; i++) {
                    next(new InvalidRequestError(data.errors[i].message));
                }
            }
        });
    }
});

// DELETE /api/admin/user/:id
router.delete('/:id', function(req, res, next) {
    var id = req.params.id;
    User.delete(id).then(function(count) {
        res.json(count);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        }
    });
});

// GET /api/admin/user/:id/reservations/:state?
router.get('/:id/reservations/:state?', function(req, res, next) {
    var id = req.params.id,
        options = {
            where: {}
        };
    if (req.params.state) {
        options.where.state = req.params.state;
    }
    User.getReservations(id, options).then(function(reservations) {
        res.json(reservations);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        }
    });
});

// GET /api/admin/user/:id/ratings
router.get('/:id/ratings', function(req, res, next) {
    var id = req.params.id;
    User.getRatings(id).then(function(ratings) {
        res.json(ratings);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            for (var i = 0; i < data.errors.length; i++) {
                next(new InvalidRequestError(data.errors[i].message));
            }
        }
    });
});

module.exports = router;
