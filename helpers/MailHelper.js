var nodemailer = require('nodemailer'),
    sendgrid = require("sendgrid")("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"),
    fs = require('fs'),
    moment = require('moment'),
    marked = require('marked');

var MailError = require(__dirname + '/../errors/MailError'),
    GetFile = require(__dirname + '/../helpers/GetFile'),
    Reservation = require(__dirname + '/../models').Reservation;

var transporter = nodemailer.createTransport();

function getTextAdmin(type, config) {
    if (type === 'confirmed') {
        return config.CONFIRMATION_CS;
    } else if (type === 'canceled_admin') {
        return config.CANCELEDADMIN_CS;
    } else if (type === 'canceled_user') {
        return config.CANCELEDUSER_CS;
    }

    return config.PRERESERVATION_CS;
}

function getSubjectAdmin(type, config) {
    if (type === 'confirmed') {
        return config.CONFIRMATION_HEADING_CS;
    } else if (type === 'canceled_admin') {
        return config.CANCELEDADMIN_HEADING_CS;
    } else if (type === 'canceled_user') {
        return config.CANCELEDUSER_HEADING_CS;
    }

    return config.PRERESERVATION_HEADING_CS;
}

function sendAdmin(type, config, date, order) {
    moment.locale('cs');
    var email = new sendgrid.Email(),
        text = getTextAdmin(type, config),
        opt = {
            from: getFrom(config),
            to: config.SENDER_EMAIL,
            subject: getSubjectAdmin(type, config).replace(/(\*datum\*|\*date\*)/, moment(date).format('L'))
        };

    email.addTo(opt.to);
    email.setFrom(opt.from);
    email.setSubject(opt.subject);

    text = text.replace(/(\*datum\*|\*date\*)/, moment(date).format('L')).replace(/\n\r?/g, '<br>');
    if (order) {
        text = text.replace(/(\*poradi\*|\*order\*)/, order);
    }

    email.setHtml(marked(text));

    sendgrid.send(email);
}

function getText(type, config, locale) {
    if (type === 'confirmed') {
        return locale === 'cs' ? config.CONFIRMATION_CS : config.CONFIRMATION_EN;
    } else if (type === 'canceled_admin') {
        return locale === 'cs' ? config.CANCELEDADMIN_CS : config.CANCELEDADMIN_EN;
    } else if (type === 'canceled_user') {
        return locale === 'cs' ? config.CANCELEDUSER_CS : config.CANCELEDUSER_EN;
    }

    return locale === 'cs' ? config.PRERESERVATION_CS : config.PRERESERVATION_EN;
}

function getFrom(config) {
    return config.SENDER_NAME + ' <' + config.SENDER_EMAIL + '>';
}

function getSubject(type, config, locale) {
    if (type === 'confirmed') {
        return locale === 'cs' ? config.CONFIRMATION_HEADING_CS : config.CONFIRMATION_HEADING_EN;
    } else if (type === 'canceled_admin') {
        return locale === 'cs' ? config.CANCELEDADMIN_HEADING_CS : config.CANCELEDADMIN_HEADING_EN;
    } else if (type === 'canceled_user') {
        return locale === 'cs' ? config.CANCELEDUSER_HEADING_CS : config.CANCELEDUSER_HEADING_EN;
    }

    return locale === 'cs' ? config.PRERESERVATION_HEADING_CS : config.PRERESERVATION_HEADING_EN;
}

var MailHelper = function() {
    var helper = {};

    helper.send = function(user, type, dates, filePath) {
        return new Promise(function(resolve, reject) {
            locale = Object.keys(user.locale)[0];
            moment.locale(locale);
            var configCustom = JSON.parse(GetFile('./config/app.json')).custom,
                email = new sendgrid.Email(),
                text = getText(type, configCustom, locale),
                opt = {
                    from: getFrom(configCustom),
                    to: user.email,
                    subject: getSubject(type, configCustom, locale).replace(/(\*datum\*|\*date\*)/, moment(dates.from).format('L'))
                };

            email.addTo(opt.to);
            email.setFrom(opt.from);
            email.setSubject(opt.subject);

            text = text.replace(/(\*datum\*|\*date\*)/, moment(dates.from).format('L')).replace(/\n\r?/g, '<br>');

            if (type === 'confirmed') {
                fs.readFile(filePath, function(err, data) {
                    if (err) {
                        reject(new MailError(err));
                    }

                    email.setHtml(marked(text));
                    email.addFile({
                        filename: locale === 'cs' ? 'vypujcni_listina.pdf' : 'loan_agreement.pdf',
                        content: data
                    });

                    sendgrid.send(email);

                    fs.unlink(filePath, function(err) {
                        if (err) {
                            reject(new MailError(err));
                        }
                        resolve({ success: true });
                    });
                });
            } else if (type === 'draft') {
                var dateStart = new Date(dates.from),
                    dateEnd = new Date(dates.to);

                dateStart.setUTCHours(0, 0, 0, 0);
                dateEnd.setUTCHours(23, 59, 59, 999);

                dateStartString = dateStart.toISOString();
                dateEndString = dateEnd.toISOString();

                var options = {
                    where: {
                        $and: [{
                            $or: [{
                                state: 'draft'
                            }, {
                                state: 'confirmed'
                            }]
                        }, {
                            $or: [{
                                $and: [
                                    { from: { $lte: dateStartString } },
                                    { to: { $gte: dateStartString } }
                                ]
                            }, {
                                $and: [
                                    { from: { $lte: dateEndString } },
                                    { to: { $gte: dateEndString } }
                                ]
                            }, {
                                $and: [
                                    { from: { $gte: dateStartString } },
                                    { to: { $lte: dateEndString } }
                                ]
                            }]
                        }]
                    }
                };

                Reservation.count(options).then(function(order) {
                    order++;
                    text = text.replace(/(\*poradi\*|\*order\*)/, order);
                    email.setHtml(marked(text));
                    sendgrid.send(email);
                    sendAdmin(type, configCustom, dates.from, order);
                    resolve({ success: true });
                }).catch(function(err) {
                    reject(err);
                });
            } else {
                email.setHtml(marked(text));
                sendgrid.send(email);
                sendAdmin(type, configCustom, dates.from);
                resolve({ success: true });
            }
        });
    };

    return helper;
};

module.exports = MailHelper;
