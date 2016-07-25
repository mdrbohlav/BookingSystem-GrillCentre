//# Oznámení
var express = require('express');
var router = express.Router();

// [API pro oznámení](../../../api/notification.html)
var Notification = require(__dirname + '/../../../api/notification');

var InvalidRequestError = require(__dirname + '/../../../errors/InvalidRequestError');

// ## Vytvoření oznámení
// `POST /api/admin/notification`
router.post('/', function(req, res, next) {
    var data = {
        content: req.body.content
    };

    Notification.create(data).then(function(notification) {
        res.json(notification);
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

// ## Smazání oznámení
// `DELETE /api/admin/notification`
router.delete('/', function(req, res, next) {
    var data = {
        id: req.body.id,
        active: false
    };

    Notification.update(data).then(function(count) {
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

// ## Exportování routeru
module.exports = router;
