var sequelize = require(__dirname + '/../models/index').sequelize,
    configCustom = require(__dirname + '/../config/app').custom;

var PdfHelper = require(__dirname + '/../helpers/PdfHelper'),
    pdf_helper = new PdfHelper();
var MailHelper = require(__dirname + '/../helpers/MailHelper'),
    mail_helper = new MailHelper();

var Reservation = require(__dirname + '/../models').Reservation,
    Rating = require(__dirname + '/../models').Rating,
    User = require(__dirname + '/user'),
    Accessory = require(__dirname + '/accessory');

function processPdfMail(req, plain) {
    return pdf_helper.getFile(req).then(function(pdfFile) {
        if (configCustom.SEND_EMAILS) {
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
    create(req, data, accessoriesArr) {
        return sequelize.transaction(function(t) {
            return Reservation.create(data, { transaction: t }).then(function(reservation) {
                var plain = reservation.get({ plain: true });
                plain.accessories = [];

                if (accessoriesArr.length === 0) {
                    return processPdfMail(req, plain).then(function(result) {
                        return result;
                    });
                }

                var accessoryWhere = {
                    id: {
                        $any: accessoriesArr
                    }
                };

                return Accessory.getObj(accessoryWhere).then(function(accessoriesData) {
                    for (var i = 0; i < accessoriesData.accessories.length; i++) {
                        plain.accessories.push(accessoriesData.accessories[i].get({ plain: true }));
                    }
                    return reservation.addAccessory(accessoriesData.accessories, { transaction: t }).then(function(response) {
                        return processPdfMail(req, plain).then(function(result) {
                            return result;
                        });
                    });
                });
            });
        });
    },

    get(options) {
        var result = {
                reservations: [],
                users: {},
                total: 0
            },
            reservationsArr = [];

        return Reservation.findAndCountAll(options).then(function(data) {
            result.total = data.count;

            return data.rows.reduce(function(sequence, reservation) {
                return sequence.then(function() {
                    return reservation.getRating();
                }).then(function(rating) {
                    return reservation.getAccessories().then(function(accessoriesData) {
                        var accessories = [];

                        for (var i = 0; i < accessoriesData.length; i++) {
                            accessories.push(accessoriesData[i].get({ plain: true }));
                        }

                        var plain = reservation.get({ plain: true });
                        plain.rating = rating ? rating.get({ plain: true }) : rating;
                        plain.accessories = accessories;
                        result.reservations.push(plain);
                    });
                });
            }, Promise.resolve());
        }).then(function() {
            var usersArr = [];
            for (var resId in result.reservations) {
                if (result.reservations[resId].userId in result.users) {
                    continue;
                }
                result.users[result.reservations[resId].userId] = {};
                usersArr.push(result.reservations[resId].userId);
            }

            return usersArr.reduce(function(sequence, userId) {
                return sequence.then(function() {
                    return User.getById(userId);
                }).then(function(user) {
                    result.users[user.id] = user;
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
                    reservation.rating = rating ? rating.get({ plain: true }) : rating;
                    reservation.accessories = [];

                    for (var i = 0; i < data.length; i++) {
                        reservation.accessories.push(data[i].get({ plain: true }));
                    }

                    return reservation;
                });
            });
        });
    },

    count(options) {
        return Reservation.count(options);
    },

    update(id, data) {
        return Reservation.update(data, {
            where: {
                id: id
            }
        });
    },

    rate(data) {
        return Rating.upsert(data);
    }
}
