var nodemailer = require('nodemailer'),
    fs = require('fs'),
    configCustom = require('../config-custom').custom;

var MailError = require('../errors/MailError');

var transporter = nodemailer.createTransport();

var MailHelper = function() {
    var helper = {};

    helper.send = function(user, type, filePath) {
        return new Promise(function(resolve, reject) {
            var mailOptions = getOptions(user.email, type),
                text = [
                    "Hello,",
                    "submission via web form was just received.",
                    "\n",
                    "Name: " + user.fullName
                ].join("\n\n");

            mailOptions.text = text;

            if (type === 'draft' &&  typeof(filePath) !== 'undefined') {
                mailOptions.attachments = [{
                    filename: 'test.pdf',
                    content: fs.createReadStream(filePath)
                }];
            }

            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    reject(new MailError(error));
                }
                resolve(info.response);
            });
        });
    };

    return helper;
};

module.exports = MailHelper;

function getOptions(email, type) {
    return {
        from: configCustom.SENDER_NAME + ' <' + configCustom.SNDER_EMAIL + '>',
        to: email,
        subject: type === 'draft' ? configCustom.DRAFT_RESERVATION_HEADING : configCustom.CONFIRM_RESERVATION_HEADING
    };
}
