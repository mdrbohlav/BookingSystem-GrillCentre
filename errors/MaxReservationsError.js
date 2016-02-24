var util = require('util');

function MaxReservationsError(perUser) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 400;

    this.customType = "MaxReservations";
    this.customMessage = "Number of maximum pre-reservations per day exceeded!";
    if (perUser) {
        this.customMessage = "Number of maximum reservations per user exceeded!";
    }
}

util.inherits(MaxReservationsError, Error);

exports = module.exports = MaxReservationsError;
