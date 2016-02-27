var express = require('express');
var router = express.Router();

var User = require('../../api/user');

var InvalidRequestError = require('../../errors/InvalidRequestError');

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

// GET /api/user
router.get('/', function(req, res, next) {
    var id = req.user.id;
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

// PUT /api/user
router.put('/', function(req, res, next) {
    var data = {
        id: req.user.id
    };
    data = getData(req, data);

    User.update(data).then(function(user) {
        res.json(user);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

// DELETE /api/user
router.delete('/', function(req, res, next) {
    var id = req.user.id;
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

// GET /api/user/reservations/:state?
router.get('/reservations/:state?', function(req, res, next) {
    var id = req.user.id,
        where = {};
    if (req.params.state) {
        where.state = req.params.state;
    }
    User.getReservations(id, where).then(function(result) {
        res.json(result);
    }).catch(function(data) {
        if ('status' in data) {
            next(data);
        } else {
            next(new InvalidRequestError(data.errors));
        }
    });
});

module.exports = router;
