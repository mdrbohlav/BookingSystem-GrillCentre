var util = require('util');

function UnauthorizedError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 401;

    this.customType = "Unauthorized";
    this.customMessage = "You are not authorized to perform this action!";
}

util.inherits(UnauthorizedError, Error);

exports = module.exports = UnauthorizedError;
