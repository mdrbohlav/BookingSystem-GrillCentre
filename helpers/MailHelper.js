var nodemailer = require('nodemailer'),
    sendgrid = require("sendgrid")("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"),
    fs = require('fs'),
    configCustom = require(__dirname + '/../config/app').custom;

var MailError = require(__dirname + '/../errors/MailError');

var transporter = nodemailer.createTransport();

function getOptions(email, type) {
    return {
        from: configCustom.SENDER_NAME + ' <' + configCustom.SENDER_EMAIL + '>',
        to: email,
        subject: type === 'draft' ? configCustom.DRAFT_RESERVATION_HEADING : configCustom.CONFIRM_RESERVATION_HEADING
    };
}

var MailHelper = function() {
    var helper = {};

    helper.send = function(user, type, filePath) {
        return new Promise(function(resolve, reject) {
            /*var mailOptions = getOptions(user.email, type),
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
            });*/
            var email = new sendgrid.Email(),
                opt = getOptions(user.email, type);

            email.addTo(opt.to);
            email.setFrom(opt.from);
            email.setSubject(opt.subject);

            if (type === 'confirmed') {
                email.setHtml("Rezervace potvrzena, prosím přinést vyplněný přiložený PDF soubor.");
                fs.readFile(filePath, function(err, data) {
                    if (err) {
                        reject(new MailError(err));
                    }

                    email.addFile({
                        filename: 'test.pdf',
                        content: data
                    });

                    sendgrid.send(email);

                    fs.unlink(filePath, function(err) {
                        if (err) {
                            reject(new MailError(err));
                        }
                        resolve({ success: true });
                    });
                });
            } else {
                email.setHtml("Předrezervace úspěšně vytvořena.");
                sendgrid.send(email);
                resolve({ success: true });
            }
        });
    };

    return helper;
};

module.exports = MailHelper;
