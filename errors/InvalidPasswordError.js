var util = require('util');

function InvalidPasswordError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
 
    this.name = this.constructor.name;
    this.status = 400;
    
    this.customType = "InvalidPassword";
    this.customMessage = "The password is incorrect.";
}

util.inherits(InvalidPasswordError, Error);

exports = module.exports = InvalidPasswordError;
