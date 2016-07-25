// # Kontrola skončených rezervací
var schedule = require('node-schedule');

var InvalidRequestError = require(__dirname + '/../errors/InvalidRequestError');

// [Model rezervace](../models/reservation.html)
var Reservation = require(__dirname + '/../models').Reservation;

// ## Funkce na kontrolu neskončených rezervací.
function checkUnfinishedReservations() {
    return new Promise(function(resolve, reject) {
        var today = new Date();

        // Nastavení pro dotaz pouze na potvrzené rezervace, které ale již skončily.
        var options = {
            where: {
                state: 'confirmed',
                to: {
                    $lt: today
                }
            }
        };

        // Dotaz na potvrzené rezervace, které již ale skončily a rovnou jejich
        // nastavení na skončené.
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

// ## Export FinishReservationHelperu
module.exports.scheduleFinishReservations = function() {
    // Kontrola neskončených rezervací.
    checkUnfinishedReservations().catch(function(err) {
        console.log(err);
    });

    // Nastavení kontroly každý den.
    schedule.scheduleJob('30 00 * * *', function() {
        checkUnfinishedReservations().catch(function(err) {
            console.log(err);
        });
    });
};
