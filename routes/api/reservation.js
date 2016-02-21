var express = require('express');
var router = express.Router();
var config = require('../../config');

var AuthHelper = require('../../helpers/AuthHelper');
var PdfHelper = require('../../helpers/PdfHelper'),
    pdf_helper = new PdfHelper();
var MailHelper = require('../../helpers/MailHelper'),
    mail_helper = new MailHelper();

var InvalidRequestError = require('../../errors/InvalidRequestError');
var MaxReservationUpfrontError = require('../../errors/MaxReservationUpfrontError');
var MaxReservationsError = require('../../errors/MaxReservationsError');
var MaxReservationLengthError = require('../../errors/MaxReservationLengthError');

var Reservation = require('../../models').Reservation;
var Rating = require('../../models').Rating;
var Accessory = require('../../models').Accessory;

// POST /api/reservation/create
router.post('/create', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
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
                state: 'draft',
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

            options.where.userId = req.user.id;

            Reservation.count(options).then(function(countUserReservations) {
                if (countUserReservations >= config.MAX_RESERVATIONS_USER) {
                    return next(new MaxReservationsError(true));
                }

                var data = {
                        from: req.body.from,
                        to: req.body.to,
                        userId: req.body.userId,
                        priority: req.body.priority
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
    }).catch(function(err) {
        return next(err);
    });
});

// GET /api/reservation/:id
router.get('/:id', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
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
    }).catch(function(err) {
        return next(err);
    });
});

// POST /api/reservation/:id/confirm
router.post('/:id/confirm', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
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
    }).catch(function(err) {
        return next(err);
    });
});

// POST /api/reservation/:id/reject
router.post('/:id/reject', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
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
    }).catch(function(err) {
        return next(err);
    });
});

// POST /api/reservation/:id/rating
router.post('/:id/rating', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, true).then(function() {
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
    }).catch(function(err) {
        return next(err);
    });
});

module.exports = router;
