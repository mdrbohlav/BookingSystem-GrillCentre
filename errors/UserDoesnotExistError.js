var util = require('util');

function UserDoesnotExistError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
 
    this.name = this.constructor.name;
    this.status = 400;
    
    this.customType = "UserDoesnotExist";
    this.customMessage = "User with specified email does not exist!";
}

util.inherits(UserDoesnotExistError, Error);

exports = module.exports = UserDoesnotExistError;
