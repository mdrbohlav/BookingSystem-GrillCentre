var schedule = require('node-schedule');

var InvalidRequestError = require('../errors/InvalidRequestError');

var Reservation = require('../models').Reservation;

function checkUnfinishedReservations() {
    return new Promise(function(resolve, reject) {
        var today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        today.toISOString();

        Reservation.findAll({
            where: {
                state: 'confirmed',
                to: {
                    $lt: today
                }
            }
        }).then(function(reservations) {
            var data = {
                state: 'finished'
            };
            if (reservations.length === 0) {
                resolve();
            }
            for (var i = 0; i < reservations.length; i++) {
                var tmp = reservations[i].get({
                    plain: true
                });
                Reservation.update(data, {
                    where: {
                        id: tmp.id
                    }
                }).then(function(affectedRows) {
                    resolve();
                }).catch(function(data) {
                    reject(new InvalidRequestError(data.errors));
                });
            }
        }).catch(function(err) {
            reject(new InvalidRequestError(err.message));
        });
    });
}

module.exports.scheduleFinishReservations = function() {
    checkUnfinishedReservations().then(function() {
    }).catch(function(err) {
        console.log(err);
    });

    schedule.scheduleJob('05 00 * * *', function() {
        checkUnfinishedReservations().then(function() {
        }).catch(function(err) {
            console.log(err);
        });
    });
};
