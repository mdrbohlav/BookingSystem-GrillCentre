var util = require('util');

function MinimumAdminsError() {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 400;

    this.customType = "MinimumAdmins";
    this.customMessage = "There has to be at least one admin!";
}

util.inherits(MinimumAdminsError, Error);

exports = module.exports = MinimumAdminsError;
