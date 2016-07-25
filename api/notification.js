// # Oznámení

// [Model oznámení](../models/notification.html)
var Notification = require(__dirname + '/../models').Notification;

module.exports = {
    // ## Vytvoření oznámení
    create(data) {
        // Dotaz, zdali již existuje oznámení.
        return Notification.findOne().then(function(n) {
            // Polud existuje, deaktivovat ho a nastavit nové.
            if (n) {
                return Notification.update({ active: false }, {
                    where: {
                        id: n.id
                    }
                }).then(function(c) {
                    return Notification.create(data).then(function(notification) {
                        return notification.get({ plain: true });
                    });
                });
            // Jinak nastavit nové rovnou.
            } else {
                return Notification.create(data).then(function(notification) {
                    return notification.get({ plain: true });
                });
            }
        });
    },

    // ## Aktualizace oznámení
    update(data) {
        return Notification.update(data, {
            where: {
                id: data.id
            }
        });
    }
};
