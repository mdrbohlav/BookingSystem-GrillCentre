var ical = require('ical-generator');
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

module.exports.createEvent = function(start, summary, description, organizer) {
    calendar.createEvent({
        start: start,
        timestamp: new Date(),
        summary: summary,
        description: description,
        organizer: organizer,
        allDay: true
    });
};

module.exports.calendar = calendar;
