var nodemailer = require('nodemailer'),
    sendgrid = require("sendgrid")("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"),
    fs = require('fs');

var GetFile = require(__dirname + '/../helpers/GetFile');

var MailError = require(__dirname + '/../errors/MailError');

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

function sendAdmin(type, config) {
    var email = new sendgrid.Email(),
        text = getTextAdmin(type, config),
        opt = {
            from: getFrom(config),
            to: config.SENDER_EMAIL,
            subject: getSubject(type, config)
        };

    email.addTo(opt.to);
    email.setFrom(opt.from);
    email.setSubject(opt.subject);

    email.setHtml(text);

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

    helper.send = function(user, type, filePath) {
        return new Promise(function(resolve, reject) {
            var configCustom = JSON.parse(GetFile('./config/app.json')).custom,
                email = new sendgrid.Email(),
                text = getText(type, configCustom, user.locale),
                opt = {
                    from: getFrom(configCustom),
                    to: user.email,
                    subject: getSubject(type, configCustom, user.locale)
                };

            email.addTo(opt.to);
            email.setFrom(opt.from);
            email.setSubject(opt.subject);

            email.setHtml(text);

            if (type === 'confirmed') {
                fs.readFile(filePath, function(err, data) {
                    if (err) {
                        reject(new MailError(err));
                    }

                    email.addFile({
                        filename: user.locale === 'cs' ? 'vypujcni_listina.pdf' : 'loan_agreement.pdf',
                        content: data
                    });

                    sendgrid.send(email);
                    sendAdmin(type, configCustom);

                    fs.unlink(filePath, function(err) {
                        if (err) {
                            reject(new MailError(err));
                        }
                        resolve({ success: true });
                    });
                });
            } else {
                sendgrid.send(email);
                sendAdmin(type, configCustom);
                resolve({ success: true });
            }
        });
    };

    return helper;
};

module.exports = MailHelper;
