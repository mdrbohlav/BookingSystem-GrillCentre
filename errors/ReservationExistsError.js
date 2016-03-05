var util = require('util');

function ReservationExistsError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 400;

    this.customType = "ReservationExists";
    this.customMessage = "This type of reservation for this time period already exists!";
}

util.inherits(ReservationExistsError, Error);

exports = module.exports = ReservationExistsError;
