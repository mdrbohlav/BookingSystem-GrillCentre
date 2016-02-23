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
var Rating = require('../../../models').Rating;
var Accessory = require('../../../models').Accessory;

module.exports = {
    create(req, res, next) {
        if (req.body.accessories && req.body.separateGrill) {
            return next(new InvalidRequestError('Cannot add accessories when booking separate grill!'));
        }

        var dateUpfront = new Date(),
            dateStart = new Date(req.body.from),
            dateEnd = new Date(req.body.to),
            MS_PER_DAY = 1000 * 60 * 60 *  24;

        dateUpfront.setDate(dateUpfront.getDate() + config.MAX_RESERVATION_UPFRONT);

        dateStart.setUTCHours(0, 0, 0, 0);
        dateEnd.setUTCHours(23, 59, 59, 999);

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
                state: 'confirmed',
                $and: [
                    { from: { gt: dateStartString } },
                    { from: { lte: dateEndString } }
                ]
            }
        };

        Reservation.count(options).then(function(countReservations) {
            if (countReservations >= config.MAX_RESERVATIONS) {
                return next(new MaxReservationsError());
            }

            options.where.state = 'draft';
            options.where.userId = req.user.id;

            Reservation.count(options).then(function(countUserReservations) {
                if (countUserReservations >= config.MAX_RESERVATIONS_USER) {
                    return next(new MaxReservationsError(true));
                }

                console.log(req.user);

                var data = {
                        from: dateStartString,
                        to: dateEndString,
                        userId: req.user.id,
                        priority: req.user.priority
                    },
                    accessories = req.body.accessories;

                if (req.body.separateGrill) {
                    data.separateGrill = true;
                }

                Reservation.create(data).then(function(reservation) {
                    var unsavedAccessories = accessories.length,
                        result = reservation.get({
                            plain: true
                        });
                    result.accessory = [];
                    if (unsavedAccessories === 0) {
                        pdf_helper.getFile(req).then(function(pdfFile) {
                            if (config.SEND_EMAILS) {
                                mail_helper.send(req.user, 'draft', pdfFile).then(function(mailResponse) {
                                    result.mailSent = true;
                                    res.json(result);
                                }).catch(function(err) {
                                    return next(err);
                                });
                            } else {
                                res.json(result);
                            }
                        }).catch(function(err) {
                            return next(err);
                        });
                    } else {
                        Accessory.findAll({ 
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
                            reservation.addAccessory(data).then(function(response) {
                                pdf_helper.getFile(req).then(function(pdfFile) {
                                    if (config.SEND_EMAILS) {
                                        mail_helper.send(req.user, 'draft', pdfFile).then(function(mailResponse) {
                                            result.mailSent = true;
                                            res.json(result);
                                        }).catch(function(err) {
                                            return next(err);
                                        });
                                    } else {
                                        res.json(result);
                                    }
                                }).catch(function(err) {
                                    return next(err);
                                });
                            }).catch(function(data) {
                                return next(new InvalidRequestError('Cannot set associations between reservation and accessories.'));
                            });
                        }).catch(function(data) {
                            return next(new InvalidRequestError('Cannot find specified accessories.'));
                        });
                    }
                }).catch(function(data) {
                    return next(new InvalidRequestError(data.errors));
                });
            }).catch(function(data) {
                return next(new InvalidRequestError(data.errors));
            });
        }).catch(function(data) {
            return next(new InvalidRequestError(data.errors));
        });
    },

    get(req, res, next) {
        var where = {},
            startInterval,
            endInterval;

        try {
            startInterval = req.query.from ? new Date(decodeURIComponent(req.query.from)) : new Date(),
            endInterval = req.query.to ? new Date(decodeURIComponent(req.query.to)) : new Date();
        } catch(err) {
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
            var reservations = [];
            for (var i = 0; i < data.rows.length; i++) {
                reservations.push(data.rows[i].get({
                    plain: true
                }));
            }
            res.json({
                reservations: reservations,
                total: data.count
            });
        }).catch(function(data) {
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
