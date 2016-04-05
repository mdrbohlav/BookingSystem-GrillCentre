var util = require('util');

function NotPaid() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
 
    this.name = this.constructor.name;
    this.status = 400;
    
    this.customType = "NotPaid";
    this.customMessage = "You do not have paid the basic membership!";
}

util.inherits(NotPaid, Error);

exports = module.exports = NotPaid;
