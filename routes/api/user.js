var express = require('express');
var router = express.Router();

var AuthHelper = require('../../helpers/AuthHelper');
var User = require('./controllers/user');

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

// POST /api/user/create
router.post('/create', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
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
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// GET /api/user
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var id = req.user.id;
        User.getById(id).then(function(user) {
            res.json(user);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// PUT /api/user
router.put('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var data = {
            id: req.user.id
        };
        data = getData(req, data);

        User.update(data).then(function(user) {
            res.json(user);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// DELETE /api/user
router.delete('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var id = req.user.id;
        User.delete(id).then(function(count) {
            res.json(count);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// GET /api/user/reservations/:state?
router.get('/reservations/:state?', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        var id = req.user.id,
            where = {};
        if (req.params.state) {
            where.state = req.params.state;
        }
        User.getReservations(id, where).then(function(reservations) {
            res.json(reservations);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// GET /api/user/:id
router.get('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var id = req.params.id;
        User.getById(id).then(function(user) {
            res.json(user);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// PUT /api/user/:id
router.put('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var data = {
            id: req.params.id
        };
        data = getData(req, data);

        User.update(data).then(function(user) {
            res.json(user);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// DELETE /api/user/:id
router.delete('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var id = req.params.id;
        User.delete(id).then(function(count) {
            res.json(count);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

// GET /api/user/:id/reservations/:state?
router.get('/:id/reservations/:state?', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
        var id = req.params.id,
            where = {};
        if (req.params.state) {
            where.state = req.params.state;
        }
        User.getReservations(id, where).then(function(reservations) {
            res.json(reservations);
        }).catch(function(err) {
            res.json(err);
        });
    }).catch(function(err) {
        next(err);
    });
});

module.exports = router;
