var util = require('util');

function MailError(err) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 401;

    this.customType = "Unauthorized";
    this.customMessage = err;
}

util.inherits(MailError, Error);

exports = module.exports = MailError;
