// # Příslušenství

// [Model příslušenství](../models/accessory.html)
var Accessory = require(__dirname + '/../models').Accessory;

module.exports = {
    // ## Vytvoření příslušenství
    create(data) {
        return Accessory.create(data).then(function(accessory) {
            return accessory.get({ plain: true });
        });
    },

    // ## Získání příslušenství
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

    // ## Získání raw dat o příslušenství
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

    // ## Získání příslušenství podle ID
    getById(id) {
        return Accessory.findById(id).then(function(accessory) {
            return accessory.get({ plain: true });
        });
    },

    // ## Aktualizace příslušenství
    update(data) {
        return Accessory.update(data, {
            where: {
                id: data.id
            }
        });
    },

    // ## Smazání příslušenství
    delete(id) {
        return Accessory.destroy({
            where: {
                id: id
            }
        });
    }
};
