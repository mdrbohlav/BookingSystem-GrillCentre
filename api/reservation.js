var sequelize = require(__dirname + '/../models/index').sequelize;

var GetFile = require(__dirname + '/../helpers/GetFile'),
    PdfHelper = require(__dirname + '/../helpers/PdfHelper'),
    pdf_helper = new PdfHelper();
var MailHelper = require(__dirname + '/../helpers/MailHelper'),
    mail_helper = new MailHelper();

var Reservation = require(__dirname + '/../models').Reservation,
    Rating = require(__dirname + '/../models').Rating,
    User = require(__dirname + '/user'),
    Accessory = require(__dirname + '/accessory');

function processMail(user, type, dates, pdfFile) {
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom;

    if (configCustom.SEND_EMAILS) {
        return mail_helper.send(user, type, dates, pdfFile).then(function(mailResponse) {
            return { success: true };
        });
    } else {
        return { success: true };
    }
}

function processPdfMail(req, user, type, dates) {
    return pdf_helper.getFile(req, user).then(function(pdfFile) {
        return processMail(user, type, dates, pdfFile.file);
    });
}

module.exports = {
    create(req, data, accessoriesArr) {
        return sequelize.transaction(function(t) {
            return Reservation.create(data, { transaction: t }).then(function(reservation) {
                var plain = reservation.get({ plain: true });
                plain.accessories = [];

                if (accessoriesArr.length === 0) {
                    var dates = {
                        from: plain.from,
                        to: plain.to
                    };
                    return mail_helper.send(req.user, 'draft', dates).then(function(mailResponse) {
                        plain.mailSent = true;
                        return plain;
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
                        var dates = {
                            from: plain.from,
                            to: plain.to
                        };
                        return mail_helper.send(req.user, 'draft', dates).then(function(mailResponse) {
                            plain.mailSent = true;
                            return plain;
                        });
                    });
                });
            });
        });
    },

    get(options, fetchUsers) {
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
            if (!fetchUsers) {
                return result;
            }

            var usersArr = [];
            for (var i = 0; i < result.reservations.length; i++) {
                if (result.reservations[i].userId in result.users) {
                    continue;
                }
                result.users[result.reservations[i].userId] = {};
                usersArr.push(result.reservations[i].userId);
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

    update(id, data, req) {
        return sequelize.transaction(function(t) {
            return Reservation.update(data, {
                where: {
                    id: id
                }
            }, { transaction: t }).then(function(count) {
                if (!('state' in data) || ['confirmed', 'canceled', 'rejected'].indexOf(data.state) < 0) {
                    return count;
                }
                return Reservation.findById(id, { transaction: t }).then(function(reservation) {
                    reservation = reservation.get({ plain: true });
                    return User.getById(reservation.userId, { transaction: t }).then(function(user) {
                        user = user.get({ plain: true });
                        var dates = {
                            from: reservation.from,
                            to: reservation.to
                        };
                        if (['canceled', 'rejected'].indexOf(data.state) > -1) {
                            var type = data.stateChangedBy === user.id ? 'canceled_user' : 'canceled_admin';
                            return mail_helper.send(user, type, dates).then(function(result) {
                                return result;
                            });
                        } else {
                            return processPdfMail(req, user, 'confirmed', dates).then(function(result) {
                                return result;
                            });
                        }
                    });
                });
            });
        });
    },

    rate(id, data) {
        return Reservation.findById(id).then(function(reservation) {
            data.userId = reservation.userId;
            data.reservationId = reservation.id;
            return Rating.upsert(data).then(function(created) {
                if (created) {
                    return data;
                }
                return created;
            });
        });
    }
}
