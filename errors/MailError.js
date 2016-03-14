var util = require('util');

function MailError(err) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
 
    this.name = this.constructor.name;
    this.status = 400;
    
    this.customType = "Mail";
    this.customMessage = err;
}

util.inherits(MailError, Error);

exports = module.exports = MailError;
