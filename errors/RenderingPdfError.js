var util = require('util');

function RenderingPdfError(message) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 401;

    this.customType = "RenderingPdf";
    this.customMessage = message;
}

util.inherits(RenderingPdfError, Error);

exports = module.exports = RenderingPdfError;
