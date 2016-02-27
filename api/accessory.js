var Accessory = require('../models').Accessory;

module.exports = {
    create(data) {
        return Accessory.create(data).then(function(accessory) {
            return accessory.get({ plain: true });
        });
    },

    get(where) {
        return Accessory.findAndCountAll({ where: where }).then(function(data) {
            var accessories = [];
            for (var i = 0; i < data.rows.length; i++) {
                accessories.push(data.rows[i].get({ plain: true }));
            }

            return {
                accessories: accessories,
                total: data.count
            };
        });
    },

    getObj(where) {
        return Accessory.findAndCountAll({ where: where }).then(function(data) {
            var accessories = [];
            for (var i = 0; i < data.rows.length; i++) {
                accessories.push(data.rows[i]);
            }

            return {
                accessories: accessories,
                total: data.count
            };
        });
    },

    getById(id) {
        return Accessory.findById(id).then(function(accessory) {
            return accessory.get({ plain: true });
        });
    },

    update(data) {
        return Accessory.update(data, {
            where: {
                id: data.id
            }
        });
    },

    delete(id) {
        return Accessory.destroy({
            where: {
                id: id
            }
        });
    }
}
