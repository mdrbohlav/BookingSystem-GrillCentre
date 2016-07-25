var util = require('util');

function UserDoesNotHaveServiceError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
 
    this.name = this.constructor.name;
    this.status = 400;
    
    this.customType = "UserDoesNotHaveService";
    this.customMessage = "User does not have activated this service.";
}

util.inherits(UserDoesNotHaveServiceError, Error);

exports = module.exports = UserDoesNotHaveServiceError;
