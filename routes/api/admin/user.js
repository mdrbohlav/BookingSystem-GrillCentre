var express = require('express');
var router = express.Router();

var AuthHelper = require('../../../helpers/AuthHelper');
var User = require('../../../api/user');

var InvalidRequestError = require('../../../errors/InvalidRequestError');

function getData(req, data) {
    if (req.body.password) {
        data.password = req.body.password;
    }
    if (req.body.email) {
        data.email = req.body.email;
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
        if (req.body.isAdmin) {
            data.isAdmin = req.body.isAdmin;
        }
        if (req.body.priority) {
            data.priority = req.body.priority;
        }
    }

    return data;
}

// POST /api/admin/user/create
router.post('/create', function(req, res, next) {
    var data = {
        password: req.body.password,
        email: req.body.email,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        block: req.body.block,
        room: req.body.room
    };
    User.create(data).then(function(user) {
        res.json(user);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
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
            next(new InvalidRequestError(data.errors));
        }
    });
});

// PUT /api/admin/user/:id
router.put('/:id', function(req, res, next) {
    var data = {
        id: req.params.id
    };
    data = getData(req, data);

    User.update(data).then(function(count) {
        if (req.user.id === id) {
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
            next(new InvalidRequestError(data.errors));
        }
    });
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
            next(new InvalidRequestError(data.errors));
        }
    });
});

// GET /api/admin/user/:id/reservations/:state?
router.get('/:id/reservations/:state?', function(req, res, next) {
    var id = req.params.id,
        where = {};
    if (req.params.state) {
        where.state = req.params.state;
    }
    User.getReservations(id, where).then(function(reservations) {
        res.json(reservations);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

module.exports = router;
