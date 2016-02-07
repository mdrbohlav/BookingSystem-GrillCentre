var util = require('util');

function InvalidAccessTokenError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
 
    this.name = this.constructor.name;
    this.status = 400;
    
    this.customType = "InvalidAccessToken";
    this.customMessage = "The access token is invalid or expired.";
}

util.inherits(InvalidAccessTokenError, Error);

exports = module.exports = InvalidAccessTokenError;
