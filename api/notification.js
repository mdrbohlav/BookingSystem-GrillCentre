var Notification = require(__dirname + '/../models').Notification;

module.exports = {
    create(data) {
        return Notification.findOne().then(function(n) {
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
            } else {
                return Notification.create(data).then(function(notification) {
                    return notification.get({ plain: true });
                });
            }
        });
    },

    update(data) {
        return Notification.update(data, {
            where: {
                id: data.id
            }
        });
    }
};
