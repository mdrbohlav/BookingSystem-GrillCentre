// # Příslušenství
var express = require('express');
var router = express.Router();

// [Helper pro autentizaci](../../../helpers/AuthHelper.html)
var AuthHelper = require(__dirname + '/../../../helpers/AuthHelper'),
    // [API pro příslušenství](../../../api/accessory.html)
    Accessory = require(__dirname + '/../../../api/accessory');

var InvalidRequestError = require(__dirname + '/../../../errors/InvalidRequestError');

// ## Vytvoření příslušenství
// `POST /api/admin/accessory/create`
router.post('/create', function(req, res, next) {
    var data = {
        name: req.body.name,
        nameEn: req.body.nameEn,
        available: req.body.available ? req.body.available : true
    };
    Accessory.create(data).then(function(accessory) {
        res.json(accessory);
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

// ## Upravení příslušenství
// `PUT /api/admin/accessory/:id`
router.put('/:id', function(req, res, next) {
    var data = {
        id: req.params.id
    };
    if (req.body.name) {
        data.name = req.body.name;
    }
    if (req.body.nameEn) {
        data.nameEn = req.body.nameEn;
    }
    if (req.body.available) {
        data.available = req.body.available;
    }

    Accessory.update(data).then(function(count) {
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

// ## Smazání příslušenství
// `DELETE /api/admin/accessory/:id`
router.delete('/:id', function(req, res, next) {
    var id = req.params.id;
    Accessory.delete(id).then(function(count) {
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
