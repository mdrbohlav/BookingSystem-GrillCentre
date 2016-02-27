var sequelize = require('../../../models/index').sequelize;
var config = require('../../../config');

var PdfHelper = require('../../../helpers/PdfHelper'),
    pdf_helper = new PdfHelper();
var MailHelper = require('../../../helpers/MailHelper'),
    mail_helper = new MailHelper();

var Reservation = require('../../../models').Reservation;
var Rating = require('../../../models').Rating;
var User = require('./user');
var Accessory = require('./accessory');

function processPdfMail(req, plain) {
    return pdf_helper.getFile(req).then(function(pdfFile) {
        if (config.SEND_EMAILS) {
            return mail_helper.send(req.user, 'draft', pdfFile).then(function(mailResponse) {
                plain.mailSent = true;
                return plain;
            });
        } else {
            plain.mailSent = false;
            return plain;
        }
    });
}

module.exports = {
    create(req, data) {
        return sequelize.transaction(function(t) {
            return Reservation.create(data, { transaction: t }).then(function(reservation) {
                var plain = reservation.get({ plain: true });
                plain.accessories = [];

                if (data.accessories.length === 0) {
                    return processPdfMail(req, plain).then(function(result) {
                        return result;
                    });
                }

                for (var i = 0; i < data.accessories.length; i++) {
                    data.accessories[i] = parseInt(data.accessories[i]);
                }

                var accessoryWhere = {
                    id: {
                        $any: data.accessories
                    }
                };

                Accessory.get(accessoryWhere).then(function(data) {
                    for (var i = 0; i < data.accessories.length; i++) {
                        plain.accessories.push(data.accessories[i].get({ plain: true }));
                    }
                    return reservation.addAccessory(data, { transaction: t }).then(function(response) {
                        return processPdfMail(req, plain).then(function(result) {
                            return result;
                        });
                    });
                });
            });
        });
    },

    get(where) {
        var result = {
                reservations: {},
                users: {},
                total: 0
            },
            reservationsArr = [];

        return Reservation.findAndCountAll({ where: where }).then(function(data) {
            for (var i = 0; i < data.length; i++) {
                var plain = data[i].get({ plain: true });
                result.reservations[plain.id] = plain;
                reservationsArr.push(data[i]);
            }

            return reservationsArr.reduce(function(sequence, reservation) {
                return sequence.then(function() {
                    return reservation.getRating().then(function(rating) {
                        return reservation.getAccessories().then(function(data) {
                            var accessories = [];

                            for (var i = 0; i < data.length; i++) {
                                accessories.push(data[i].get({ plain: true }));
                            }

                            return accessories;
                        }).then(function(accessories) {
                            var plain = reservation.get({ plain: true });
                            result.reservations[plain.id].rating = rating.get({ plain: true });
                            result.reservations[plain.id].accessories = accessories;
                            if (plain.userId in result.users) {
                                return result;
                            }
                            return User.getById(plain.userId).then(function(user) {
                                var plain = user.get({ plain: true });
                                result.users[plain.id] = plain;
                            });
                        });
                    });
                });
            }, Promise.resolve());
        }).then(function() {
            return result;
        });
    },

    getById(id) {
        return Reservation.findById(id).then(function(reservation) {
            return reservation.getRating().then(function(rating) {
                return reservation.getAccessories().then(function(data) {
                    reservation = reservation.get({ plain: true });
                    reservation.rating = rating.get({ plain: true });
                    reservation.accessories = [];

                    for (var i = 0; i < data.length; i++) {
                        reservation.accessories.push(data[i].get({ plain: true }));
                    }

                    return reservation;
                });
            });
        });
    },

    confirm(id) {
        return Reservation.update({
            state: 'confirmed'
        }, {
            where: {
                id: id
            }
        });
    },

    reject(id) {
        return Reservation.update({
            state: 'rejected'
        }, {
            where: {
                id: id
            }
        });
    },

    cancel(id) {
        return Reservation.update({
            state: 'canceled'
        }, {
            where: {
                id: id
            }
        });
    },

    rate(data) {
        return Rating.upsert(data);
    }
}
