var util = require('util');

function MaxReservationUpfrontError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 400;

    this.customType = "MaxReservationUpfront";
    this.customMessage = "Reservation cannot be created so many days upfront!";
}

util.inherits(MaxReservationUpfrontError, Error);

exports = module.exports = MaxReservationUpfrontError;
