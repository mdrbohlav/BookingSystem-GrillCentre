var schedule = require('node-schedule');

var InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError');

var Reservation = require(__dirname + '/../models').Reservation;

function checkUnfinishedReservations() {
    return new Promise(function(resolve, reject) {
        var today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        today.toISOString();

        var options = {
            where: {
                state: 'confirmed',
                to: {
                    $lt: today
                }
            }
        };

        Reservation.findAll(options).then(function(reservations) {
            return reservations.reduce(function(sequence, reservation) {
                return sequence.then(function() {
                    var data = {
                        state: 'finished'
                    };
                    return Reservation.update(data, {
                        where: {
                            id: reservation.id
                        }
                    });
                });
            }, Promise.resolve());
        }).catch(function(err) {
            reject(new InvalidRequestError(err.message));
        });
    });
}

module.exports.scheduleFinishReservations = function() {
    checkUnfinishedReservations().then(function() {}).catch(function(err) {
        console.log(err);
    });

    schedule.scheduleJob('05 00 * * *', function() {
        checkUnfinishedReservations().then(function() {}).catch(function(err) {
            console.log(err);
        });
    });
};
