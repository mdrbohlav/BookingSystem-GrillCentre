// # Helper na posílání e-mailů
var nodemailer = require('nodemailer'),
    conf = require(__dirname + '/../config/global'),
    // Vytvoření transporteru se strahovským SMTP.
    transporter = nodemailer.createTransport('smtp://smtp.sh.cvut.cz'),
    sendgrid = require("sendgrid")(conf.SENDRIG_API_KEY),
    fs = require('fs'),
    moment = require('moment'),
    marked = require('marked');

var MailError = require(__dirname + '/../errors/MailError'),
    // [Helper pro načtení souboru](../helpers/GetFile.html)
    GetFile = require(__dirname + '/../helpers/GetFile'),
    // [Model rezdrvace](../models/reservation.html)
    Reservation = require(__dirname + '/../models').Reservation;

// ## Funkce na získání pořadí rezrvace
// Respektive jen nastavení pro dotaz.
function getOrderCountOptions(dateStartString, dateEndString) {
    return {
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
}

// ## Poslání draft e-mailu
function sendDraft(type, reservation, opt, config) {
    return new Promise(function(resolve, reject) {
        // Nastavení datumů začátku a konce rezervace.
        var dateStart = new Date(reservation.from),
            dateEnd = new Date(reservation.to);

        dateStart.setUTCHours(0, 0, 0, 0);
        dateEnd.setUTCHours(23, 59, 59, 999);

        dateStartString = dateStart.toISOString();
        dateEndString = dateEnd.toISOString();

        // Získání nastavení pro dotaz na pořadí rezervace.
        var options = getOrderCountOptions(dateStartString, dateEndString);

        Reservation.count(options).then(function(order) {
            // True, pokud se jedná os strahovský e-mail.
            var isIs = /@sh\.cvut\.cz$/.test(opt.to[0]);

            // Nastavení obsahu e-mailu.
            order++;
            opt.html = opt.html.replace(/(\*poradi\*|\*order\*)/, order);
            opt.html = marked(opt.html);
            // Přidání správce mezi příjemce.
            opt.to.push(getRecipient(config.SENDER_NAME, config.SENDER_EMAIL));

            // Callback po odeslání e-mailu.
            function sendCb(err, json) {
                // Pokud nastala chyba, vrátit `MailError`.
                if (err) {
                    console.log("sendDraft", err);
                    if (typeof(err) === 'object') {
                        err = err[0];
                    }
                    reject(new MailError(err));
                }

                // Jinak vrátit úspěch.
                resolve({ success: true });
            }

            // Pokud se jedná o strahovský e-mail, použít strahovské SMTP.
            if (isIs) {
                transporter.sendMail(opt, sendCb);
            // Jinak použít SendGrid.
            } else {
                var email = new sendgrid.Email(opt);
                sendgrid.send(email, sendCb);
            }
        });
    });
}

// ## Poslání potvrzujícího e-mailu
function sendConfirmed(filePath, opt) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filePath, function(err, data) {
            if (err) {
                console.log("sendConfirmed fs", err);
                reject(new MailError(err));
            }

            // Nastavení obsahu e-mailu.
            opt.html = marked(opt.html);

            var file = {
                filename: locale === 'cs' ? 'vypujcni_listina.pdf' : 'loan_agreement.pdf',
                content: data
            };

            // Callback po odeslání e-mailu.
            function sendCb(err, json) {
                // Pokud nastala chyba, vrátit `MailError`.
                if (err) {
                    console.log("sendConfirmed", err);
                    if (typeof(err) === 'object') {
                        err = err[0];
                    }
                    reject(new MailError(err));
                }

                fs.unlink(filePath);

                // Jinak vrátit úspěch.
                resolve({ success: true });
            }

            // Pokud se jedná o strahovský e-mail, použít strahovské SMTP.
            if (/@sh\.cvut\.cz$/.test(opt.to[0])) {
                // Přidat smlouvu jako přílohu.
                opt.attachments = [file];
                transporter.sendMail(opt, sendCb);
            // Jinak použít SendGrid.
            } else {
                // Přidat smlouvu jako přílohu.
                opt.files = [file];
                var email = new sendgrid.Email(opt);
                sendgrid.send(email, sendCb);
            }
        });
    });
}

// ## Poslání zrušeného e-mailu
function sendCanceled(type, dates, opt, config) {
    return new Promise(function(resolve, reject) {
        // True, pokud se jedná os strahovský e-mail.
        var isIs = /@sh\.cvut\.cz$/.test(opt.to[0]);

        // Nastavení obsahu e-mailu.
        opt.html = marked(opt.html);
        // Přidání správce mezi příjemce.
        opt.to.push(getRecipient(config.SENDER_NAME, config.SENDER_EMAIL));

        // Callback po odeslání e-mailu.
        function sendCb(err, json) {
            // Pokud nastala chyba, vrátit `MailError`.
            if (err) {
                console.log("sendCanceled", err);
                if (typeof(err) === 'object') {
                    err = err[0];
                }
                reject(new MailError(err));
            }

            // Jinak vrátit úspěch.
            resolve({ success: true });
        }

        // Pokud se jedná o strahovský e-mail, použít strahovské SMTP.
        if (isIs) {
            transporter.sendMail(opt, sendCb);
        // Jinak použít SendGrid.
        } else {
            var email = new sendgrid.Email(opt);
            sendgrid.send(email, sendCb);
        }
    });
}

// ## Poslání obecného e-mailu
function sendGeneral(opt) {
    return new Promise(function(resolve, reject) {
        // Callback po odeslání e-mailu.
        function sendCb(err, json) {
            // Pokud nastala chyba, vrátit `MailError`.
            if (err) {
                console.log("sendGeneral", err);
                if (typeof(err) === 'object') {
                    err = err[0];
                }
                reject(new MailError(err));
            }

            // Jinak vrátit úspěch.
            resolve({ success: true });
        }

        // Pokud se jedná o strahovský e-mail, použít strahovské SMTP.
        if (/@sh\.cvut\.cz$/.test(opt.to[0])) {
            transporter.sendMail(opt, sendCb);
        // Jinak použít SendGrid.
        } else {
            var email = new sendgrid.Email(opt);
            sendgrid.send(email, sendCb);
        }
    });
}

// ## Získání textu podle typu e-mailu a jazyka
function getText(type, config, locale) {
    if (type === 'confirmed') {
        return locale === 'cs' ? config.CONFIRMATION_CS : config.CONFIRMATION_EN;
    } else if (type === 'canceled_admin') {
        return locale === 'cs' ? config.CANCELEDADMIN_CS : config.CANCELEDADMIN_EN;
    } else if (type === 'canceled_user') {
        return locale === 'cs' ? config.CANCELEDUSER_CS : config.CANCELEDUSER_EN;
    } else if (type === 'new_user') {
        return locale === 'cs' ? config.NEWUSER_CS : config.NEWUSER_EN;
    }

    return locale === 'cs' ? config.PRERESERVATION_CS : config.PRERESERVATION_EN;
}

// ## Získání příjemce
function getRecipient(name, email) {
    return '"' + name + '" <' + email + '>';
}

// ## Získání předmwtu podle typu e-mailu a jazyka
function getSubject(type, config, locale) {
    if (type === 'confirmed') {
        return locale === 'cs' ? config.CONFIRMATION_HEADING_CS : config.CONFIRMATION_HEADING_EN;
    } else if (type === 'canceled_admin') {
        return locale === 'cs' ? config.CANCELEDADMIN_HEADING_CS : config.CANCELEDADMIN_HEADING_EN;
    } else if (type === 'canceled_user') {
        return locale === 'cs' ? config.CANCELEDUSER_HEADING_CS : config.CANCELEDUSER_HEADING_EN;
    } else if (type === 'new_user') {
        return locale === 'cs' ? config.NEWUSER_HEADING_CS : config.NEWUSER_HEADING_EN;
    }

    return locale === 'cs' ? config.PRERESERVATION_HEADING_CS : config.PRERESERVATION_HEADING_EN;
}

// ## Objekt helperu
var MailHelper = function() {
    var helper = {};

    // ### Funkce na poslání e-mailu
    helper.send = function(user, type, reservation, filePath, password) {
        return new Promise(function(resolve, reject) {
            // Nastavení jazyka knihovny moment na práci s datumy
            locale = Object.keys(user.locale)[0];
            moment.locale(locale);

            // Načtení konfiguračního souboru s texty apod.
            var configCustom = JSON.parse(GetFile('./config/app.json')).custom,
                // Získání správného znění e-mailu.
                text = getText(type, configCustom, locale),
                // Nastavení e-mailu - odesílatel, příjemce, předmět a hlavička `X-Grill`.
                opt = {
                    from: getRecipient(configCustom.SENDER_NAME, configCustom.SENDER_EMAIL),
                    to: [ getRecipient(user.fullName, user.email) ],
                    subject: getSubject(type, configCustom, locale),
                    headers: {
                        'X-Grill': type
                    }
                };

            // Nahrazení všech proměnných.
            text = text.replace(/\n\r?/g, '<br>');
            text = text.replace(/(\*jmeno\*|\*firstname\*)/, user.firstname);
            text = text.replace(/(\*prijmeni\*|\*lastname\*)/, user.lastname);

            if (reservation) {
                text = text.replace(/(\*datum\*|\*date\*)/, moment(reservation.from).format('L'));
                opt.subject = opt.subject.replace(/(\*datum\*|\*date\*)/, moment(reservation.from).format('L'))
                text = text.replace(/(\*komentar\*|\*comment\*)/, reservation.comment);
                text = text.replace(/(\*komentar_zamitnuti\*|\*reject_comment\*)/, reservation.rejectReason);
            }
            if (password) {
                text = text.replace(/(\*heslo\*|\*password\*)/, password);
            }
            opt.html = text;

            // Zavolání správné funkce na poslání e-mailu na základě jeho typu
            if (type === 'draft') {
                sendDraft(type, reservation, opt, configCustom).then(function(res) {
                    resolve(res);
                }).catch(function(err) {
                    reject(err);
                });
            } else if (type === 'confirmed') {
                sendConfirmed(filePath, opt).then(function(res) {
                    resolve(res);
                }).catch(function(err) {
                    reject(err);
                });
            } else if (['canceled_user', 'canceled_admin'].indexOf(type) > -1) {
                sendCanceled(type, reservation, opt, configCustom).then(function(res) {
                    resolve(res);
                }).catch(function(err) {
                    reject(err);
                });
            } else {
                sendGeneral(opt).then(function(res) {
                    resolve(res);
                }).catch(function(err) {
                    reject(err);
                });
            }
        });
    };

    return helper;
};

// ## Export MailHelperu
module.exports = MailHelper;
