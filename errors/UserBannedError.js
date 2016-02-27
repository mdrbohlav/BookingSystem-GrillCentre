var util = require('util');

function UserBannedError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
 
    this.name = this.constructor.name;
    this.status = 400;
    
    this.customType = "UserBanned";
    this.customMessage = "This user is banned!";
}

util.inherits(UserBannedError, Error);

exports = module.exports = UserBannedError;
