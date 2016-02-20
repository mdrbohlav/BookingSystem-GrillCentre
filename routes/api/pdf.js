var express = require('express');
var router = express.Router();

var AuthHelper = require('../../helpers/AuthHelper');
var PdfHelper = require('../../helpers/PdfHelper');

var InvalidRequestError = require('../../errors/InvalidRequestError');
var RenderingPdfError = require('../../errors/RenderingPdfError');

// GET /api/pdf
router.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next, false).then(function() {
        PdfHelper.createPhantomSession(function(session) {
            PdfHelper.renderPdf(session, req, next, function(filePath, fileName) {
                res.json({
                    success: true,
                    file: filePath + fileName
                });
            });
        });
    }).catch(function() {
        return next(new InvalidRequestError(data.errors));
    });
});

module.exports = router;
