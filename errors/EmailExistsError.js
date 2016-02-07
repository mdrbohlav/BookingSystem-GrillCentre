var util = require('util');

function EmailExistsError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
 
    this.name = this.constructor.name;
    this.status = 400;
    
    this.customType = "EmailExists";
    this.customMessage = "User with specified e-mail already exists.";
}

util.inherits(EmailExistsError, Error);

exports = module.exports = EmailExistsError;
