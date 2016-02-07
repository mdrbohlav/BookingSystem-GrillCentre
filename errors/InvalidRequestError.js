var util = require('util');

function InvalidRequestError(valErrors) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 400;

    this.customType = "InvalidRequest";
    this.customMessage = valErrors;
}

util.inherits(InvalidRequestError, Error);

exports = module.exports = InvalidRequestError;
