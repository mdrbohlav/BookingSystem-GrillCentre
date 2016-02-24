var util = require('util');

function MaxReservationLengthError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 400;

    this.customType = "MaxReservationLength";
    this.customMessage = "Maximum reservation length exceeded!";
}

util.inherits(MaxReservationLengthError, Error);

exports = module.exports = MaxReservationLengthError;
