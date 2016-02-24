var util = require('util');

function RenderingPdfError(message) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = 400;

    this.customType = "RenderingPdf";
    this.customMessage = message;
}

util.inherits(RenderingPdfError, Error);

exports = module.exports = RenderingPdfError;
