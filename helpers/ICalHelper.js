var ical = require('ical-generator');

var User = require(__dirname + '/../models').User,
    Reservation = require(__dirname + '/../models').Reservation;

var options = {
    domain: 'gc.sh.cvut.cz',
    prodId: {
        company: 'SiliconHill',
        product: 'Grill Centre',
        language: 'EN'
    },
    name: 'SiliconHill Grill Centre',
    url: 'http://gc.sh.cvut:3000/reservations.ical',
    timezone: 'Europe/Prague',
};

var calendar = ical(options);

function createEvent(id, start, summary, description, organizer) {
    calendar.createEvent({
        id: id,
        start: start,
        timestamp: new Date(),
        summary: summary,
        description: description,
        organizer: organizer,
        allDay: true
    });
}

function initCalendar() {
    var options = {
        where: {
            $or: [
                { state: 'confirmed' },
                { state: 'finished' }
            ]
        }
    };

    Reservation.findAll(options).then(function(reservations) {
        return reservations.reduce(function(sequence, reservation) {
            return sequence.then(function() {
                return User.findById(reservation.userId);
            }).then(function(user) {
                var id = reservation.id,
                    start = new Date(reservation.from),
                    summary = user.fullName + ' reservation',
                    description = 'Key pickup time: ' + Math.floor(reservation.pickup / 60) + ':' + reservation.pickup % 60,
                    organizer = user.fullName + ' <' + user.email + '>';
                createEvent(id, start, summary, description, organizer);
            });
        }, Promise.resolve());
    });
}

module.exports.calendar = calendar;
module.exports.createEvent = createEvent;
module.exports.initCalendar = initCalendar;
