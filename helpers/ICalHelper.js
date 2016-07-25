// # Generování iCal
var ical = require('ical-generator');

// [Model uživatele](../models/user.html)
var User = require(__dirname + '/../models').User,
    // [Model rezervace](../models/reservation.html)
    Reservation = require(__dirname + '/../models').Reservation;

// Obecné nastavení kalendáře.
var opt = {
    domain: 'gc.sh.cvut.cz',
    prodId: {
        company: 'Silicon Hill',
        product: 'Grilovací centrum',
        language: 'CS'
    },
    name: 'Grilovací centrum Silicon Hill',
    timezone: 'Europe/Prague'
};

// ## Funkce na přidání 0 před jednociferné číslo.
function pad(n) {
    return n < 10 ? '0' + n : n;
}

// ## Funkce na vytvoření záznamu.
function createEvent(calendar, user, reservation) {
    // Nastavení hodnot záznamu v kalendáři.
    var id = reservation.id,
        start = new Date(reservation.from),
        summary = '[GC] ' + user.fullName,
        description = '',
        organizer = {
            name: user.fullName,
            email: user.email
        };

    description += 'Výpůjčitel: ' + user.fullName + '\n';
    description += 'Email: ' + user.email + '\n';
    if (user.phone) {
        description += 'Telefon: ' + user.phone.replace(/^00/, '+') + '\n';
    }
    description += 'Čas vyzvednutí: ' + Math.floor(reservation.pickup / 60) + ':' + pad(reservation.pickup % 60) + '\n';
    if (reservation.comment) {
        description += 'Komentář: ' + reservation.comment + '\n';
    }

    // Přidání záznamu do kalendáře.
    calendar.createEvent({
        start: start,
        timestamp: new Date(),
        summary: summary,
        description: description,
        organizer: organizer,
        allDay: true
    });
}

// ## Objekt helperu
var ICalHelper = function() {
    var helper = {};

    // ### Funkce získání draft kalendáře 
    helper.createDraft = function() {
        // Dodatečné nastavení kalendáře.
        opt.name += ' - předrezervace';
        opt.url = 'https://gc.sh.cvut.cz/reservations-draft.ical';
        var calendar = ical(opt),
            options = {
                where: {
                    state: 'draft'
                }
            };

        // Dotaz na všechny předrezervace a jejich uživatele.
        return Reservation.findAll(options).then(function(reservations) {
            return reservations.reduce(function(sequence, reservation) {
                return sequence.then(function() {
                    return User.findById(reservation.userId);
                }).then(function(user) {
                    createEvent(calendar, user, reservation);
                });
            }, Promise.resolve());
        }).then(function() {
            return calendar;
        });
    };

    // ### Funkce získání confirmed/finished kalendáře 
    helper.createConfirmedFinished = function() {
        // Dodatečné nastavení kalendáře.
        opt.name += ' - potvrzené rezervace';
        opt.url = 'https://gc.sh.cvut.cz/reservations.ical';
        var calendar = ical(opt),
            options = {
                where: {
                    $or: [
                        { state: 'confirmed' },
                        { state: 'finished' }
                    ]
                }
            };

        // Dotaz na všechny potvrzené a skončené rezrvace a jejich uživatele.
        return Reservation.findAll(options).then(function(reservations) {
            return reservations.reduce(function(sequence, reservation) {
                return sequence.then(function() {
                    return User.findById(reservation.userId);
                }).then(function(user) {
                    createEvent(calendar, user, reservation);
                });
            }, Promise.resolve());
        }).then(function() {
            return calendar;
        });
    };

    return helper;
};

// ## Export ICalHelperu
module.exports = ICalHelper;
