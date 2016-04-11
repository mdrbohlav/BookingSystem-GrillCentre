var ical = require('ical-generator');

var User = require(__dirname + '/../models').User,
    Reservation = require(__dirname + '/../models').Reservation;

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

function pad(n) {
    return n < 10 ? '0' + n : n;
}

function createEvent(calendar, user, reservation) {
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

    calendar.createEvent({
        start: start,
        timestamp: new Date(),
        summary: summary,
        description: description,
        organizer: organizer,
        allDay: true
    });
}

var ICalHelper = function() {
    var helper = {};

    helper.createDraft = function() {
        opt.name += ' - předrezervace';
        opt.url = 'http://gc-dev.sh.cvut.cz/reservations-draft.ical';
        var calendar = ical(opt),
            options = {
                where: {
                    state: 'draft'
                }
            };

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

    helper.createConfirmedFinished = function() {
        opt.name += ' - potvrzené rezervace';
        opt.url = 'http://gc-dev.sh.cvut.cz/reservations.ical';
        var calendar = ical(opt),
            options = {
                where: {
                    $or: [
                        { state: 'confirmed' },
                        { state: 'finished' }
                    ]
                }
            };

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

module.exports = ICalHelper;
