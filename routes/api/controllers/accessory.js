var config = require('../../../config');

var InvalidRequestError = require('../../../errors/InvalidRequestError');

var Accessory = require('../../../models').Accessory;

module.exports = {
    create(req, res, next) {
        var data = {
            name: req.body.name,
            available: req.body.available ? req.body.available : true
        };
        Accessory.create(data).then(function(accessory) {
            res.json(accessory.get({
                plain: true
            }));
        }).catch(function(data) {
            return next(new InvalidRequestError(data.errors));
        });
    },

    get(req, res, next, cb) {
        var where = {};
        if (req.query.available) {
            where = {
                available: req.query.available === 'true' ? true : false
            };
        }
        Accessory.findAndCountAll({
            where: where
        }).then(function(data) {
            var accessories = [];
            for (var i = 0; i < data.rows.length; i++) {
                accessories.push(data.rows[i].get({
                    plain: true
                }));
            }
            if (typeof(cb) !== 'undefined') {
                cb({
                    accessories: accessories,
                    total: data.count
                });
            } else {
                res.json({
                    accessories: accessories,
                    total: data.count
                });
            }
        }).catch(function(data) {
            return next(new InvalidRequestError('This accessory does not exist.'));
        });
    },

    getSpecific(req, res, next) {
        Accessory.findById(req.params.id).then(function(accessory) {
            res.json(accessory.get({
                plain: true
            }));
        }).catch(function(data) {
            return next(new InvalidRequestError('This accessory does not exist.'));
        });
    },

    delete(req, res, next) {
        Accessory.destroy({
            where: {
                id: req.params.id
            }
        }).then(function(destroyedRows) {
            res.json({
                success: true,
                destroyedRows: destroyedRows
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('This accessory does not exist.'));
        });
    }
}
