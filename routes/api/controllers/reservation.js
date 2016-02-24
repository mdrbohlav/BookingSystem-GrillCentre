var sequelize = require('../../../models/index').sequelize;
var config = require('../../../config');

var PdfHelper = require('../../../helpers/PdfHelper'),
    pdf_helper = new PdfHelper();
var MailHelper = require('../../../helpers/MailHelper'),
    mail_helper = new MailHelper();

var InvalidRequestError = require('../../../errors/InvalidRequestError');
var MaxReservationUpfrontError = require('../../../errors/MaxReservationUpfrontError');
var MaxReservationsError = require('../../../errors/MaxReservationsError');
var MaxReservationLengthError = require('../../../errors/MaxReservationLengthError');

var Reservation = require('../../../models').Reservation;
var User = require('../../../models').User;
var Rating = require('../../../models').Rating;
var Accessory = require('../../../models').Accessory;

module.exports = {
    create(req, res, next) {
        if (req.body.accessories && req.body.separateGrill) {
            return next(new InvalidRequestError('Cannot add accessories when booking separate grill!'));
        }

        var dateUpfront = new Date(),
            today = new Date(),
            dateStart = new Date(req.body.from),
            dateEnd = new Date(req.body.to),
            MS_PER_DAY = 1000 * 60 * 60 *  24;

        dateUpfront.setDate(dateUpfront.getDate() + config.MAX_RESERVATION_UPFRONT);

        today.setUTCHours(0, 0, 0, 0);
        dateStart.setUTCHours(0, 0, 0, 0);
        dateEnd.setUTCHours(23, 59, 59, 999);

        today = today.toISOString();
        dateStartString = dateStart.toISOString();
        dateEndString = dateEnd.toISOString();

        dateStartMs = dateStart.getTime();
        dateEndMs = dateEnd.getTime();

        if (dateStart > dateUpfront) {
            return next(new MaxReservationUpfrontError());
        }

        if (dateEndMs - dateStartMs > config.MAX_RESERVATION_LENGTH * MS_PER_DAY) {
            return next(new MaxReservationLengthError());
        }

        var options = {
            where: {
                state: 'draft',
                $and: [
                    { from: { gte: dateStartString } },
                    { from: { lte: dateEndString } }
                ]
            }
        };

        Reservation.count(options).then(function(countReservations) {
            if (countReservations >= config.MAX_PRERESERVATIONS_DAY) {
                return next(new MaxReservationsError());
            }

            delete options.where.$and;
            options.where.from = { gte: today };
            options.where.state = 'confirmed';
            options.where.userId = req.user.id;

            console.log(options);

            return Reservation.count(options).then(function(countUserReservations) {
                console.log(countUserReservations);
                if (countUserReservations >= config.MAX_RESERVATIONS_USER) {
                    return next(new MaxReservationsError(true));
                }

                var data = {
                        from: dateStartString,
                        to: dateEndString,
                        pickup: parseInt(req.body.pickup),
                        userId: req.user.id,
                        priority: req.user.priority
                    },
                    accessories = typeof(req.body['accessories[]']) !== 'undefined' ? req.body['accessories[]'] : [];

                if (req.body.separateGrill) {
                    data.separateGrill = true;
                }

                return sequelize.transaction(function(t) {
                    return Reservation.create(data, { transaction: t }).then(function(reservation) {
                        var unsavedAccessories = accessories.length,
                            result = reservation.get({
                                plain: true
                            });

                        result.accessory = [];
                        if (unsavedAccessories === 0) {
                            return pdf_helper.getFile(req).then(function(pdfFile) {
                                if (config.SEND_EMAILS) {
                                    return mail_helper.send(req.user, 'draft', pdfFile).then(function(mailResponse) {
                                        result.mailSent = true;
                                        return result;
                                    }).catch(function(err) {
                                        throw err;
                                    });
                                } else {
                                    return result;
                                }
                            }).catch(function(err) {
                                throw err;
                            });
                        } else {
                            for (var i = 0; i < accessories.length; i++) {
                                accessories[i] = parseInt(accessories[i]);
                            }
                            return Accessory.findAll({ 
                                where: {
                                    id: {
                                        $any: accessories
                                    }
                                }
                            }).then(function(data) {
                                for (var i = 0; i < data.length; i++) {
                                    result.accessory.push(data[i].get({
                                        plain: true
                                    }));
                                }
                                return reservation.addAccessory(data, { transaction: t }).then(function(response) {
                                    return pdf_helper.getFile(req).then(function(pdfFile) {
                                        if (config.SEND_EMAILS) {
                                            return mail_helper.send(req.user, 'draft', pdfFile).then(function(mailResponse) {
                                                result.mailSent = true;
                                                return result;
                                            }).catch(function(err) {
                                                throw err;
                                            });
                                        } else {
                                            return result;
                                        }
                                    })
                                }).catch(function(err) {
                                    if ('status' in err) {
                                        throw err;
                                    } else {
                                        throw new InvalidRequestError('Cannot set associations between reservation and accessories.');
                                    }
                                });
                            }).catch(function(err) {
                                if ('status' in err) {
                                    throw err;
                                } else {
                                    throw new InvalidRequestError('Cannot find specified accessories.');
                                }
                            });
                        }
                    }).catch(function(err) {
                        console.log(err);
                        if ('status' in err) {
                            throw err;
                        } else {
                            throw new InvalidRequestError(err.errors);
                        }
                    });

                }).then(function(result) {
                    res.json(result);
                }).catch(function(err) {
                    return next(err);
                });
            }).catch(function(data) {
                return next(new InvalidRequestError(data.errors));
            });
        }).catch(function(data) {
            return next(new InvalidRequestError(data.errors));
        });
    },

    get(req, res, next, cb) {
        var where = {},
            startInterval,
            endInterval;

        try {
            startInterval = req.query.from ? new Date(decodeURIComponent(req.query.from)) : new Date(),
                endInterval = req.query.to ? new Date(decodeURIComponent(req.query.to)) : new Date();
        } catch (err) {
            return next(new InvalidRequestError('Invalid date format!'));
        }

        startInterval.setUTCHours(0, 0, 0, 0);
        endInterval.setUTCHours(23, 59, 59, 999);
        where.$and = [
            { from: { gte: startInterval } },
            { from: { lte: endInterval } }
        ];
        if (req.params.state) {
            where.state = req.params.state;
        }
        Reservation.findAndCountAll({
            where: where
        }).then(function(data) {
            if (data.rows.length === 0) {
                return {
                    reservations: [],
                    users: {},
                    total: 0
                };
            }
            var reservations = [],
                users = {},
                usersArr = [];
            for (var i = 0; i < data.rows.length; i++) {
                var tmp = data.rows[i].get({
                    plain: true
                });
                reservations.push(tmp);
                if (tmp.userId in users) {
                    continue;
                }
                users[tmp.userId] = {};
                usersArr.push(tmp.userId);
            }

            var promiseFor = function(condition, action, value) {
                if (!condition(value)) return value;
                return action(value).then(promiseFor.bind(null, condition, action));
            };

            return promiseFor(function(count) {
                return count < usersArr.length;
            }, function(count) {
                return User.findById(usersArr[count]).then(function(res) {
                    var tmp = res.get({
                        plain: true
                    });
                    users[tmp.id] = tmp;
                    return ++count;
                });
            }, 0).then(function() {
                return {
                    reservations: reservations,
                    users: users,
                    total: data.rows.length
                };
            });

        }).then(function(result) {
            if (typeof(cb) !== 'undefined') {
                cb(result);
            } else {
                res.json(result);
            }
        }).catch(function(err) {
            console.log(err);
            return next(new InvalidRequestError('Something went wrong, please try again.'));
        });
    },

    getSpecific(req, res, next) {
        Reservation.findById(req.params.id).then(function(reservation) {
            reservation.getRating().then(function(rating) {
                reservation.getAccessories().then(function(data) {
                    reservation = reservation.get({
                        plain: true
                    });
                    reservation.rating = rating;
                    reservation.accessory = [];
                    for (var i = 0; i < data.length; i++) {
                        reservation.accessory.push(data[i].get({
                            plain: true
                        }));
                    }
                    res.json(reservation);
                }).catch(function(data) {
                    return next(new InvalidRequestError('Cannot get accessories for the reservation.'));
                });
            }).catch(function(data) {
                return next(new InvalidRequestError('Cannot get rating for the reservation.'));
            });
        }).catch(function(data) {
            return next(new InvalidRequestError('This reservation does not exist.'));
        });
    },

    confirm(req, res, next) {
        var data = {
            state: 'confirmed'
        };
        Reservation.update(data, {
            where: {
                id: req.params.id
            }
        }).then(function(affectedRows) {
            // TODO: send email with generated pdf
            res.json({
                success: true,
                affectedRows: affectedRows
            });
        }).catch(function(data) {
            return next(new InvalidRequestError(data.errors));
        });
    },

    reject(req, res, next) {
        var data = {
            state: 'rejected'
        };
        Reservation.update(data, {
            where: {
                id: req.params.id
            }
        }).then(function(affectedRows) {
            // TODO: send email
            res.json({
                success: true,
                affectedRows: affectedRows
            });
        }).catch(function(data) {
            return next(new InvalidRequestError(data.errors));
        });
    },

    rating(req, res, next) {
        var data = {
            reservationId: req.params.id,
            userId: req.body.userId,
            value: req.body.value
        };
        if (req.body.comment) {
            data.comment = req.body.comment;
        }
        Rating.upsert(data).then(function(created) {
            res.json({
                success: true,
                created: created
            });
        }).catch(function(data) {
            return next(new InvalidRequestError(data.errors));
        });
    }
}
