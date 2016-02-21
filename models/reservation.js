"use strict";

var moment      = require('moment');

module.exports = function(sequelize, DataTypes) {
    var Reservation = sequelize.define("Reservation", {
        from: {
            type: DataTypes.DATE,
            allowNull: false,
            validate: {
                isDate: function (val) {
                    var val = new Date(val).toISOString();
                    if (!moment(val, moment.ISO_8601, true).isValid()) {
                        throw new Error('Invalid date format.');
                    }
                },
                isFuture: function(val) {
                    var now = new Date(),
                        val = new Date(val);
                    now.setUTCHours(0, 0, 0, 0);
                    val.setUTCHours(0, 0, 0, 0);
                    if (now > val) {
                        throw new Error('Starting date must be in the future.');
                    }
                }
            }
        },
        to: {
            type: DataTypes.DATE,
            allowNull: false,
            validate: {
                isDate: function (val) {
                    var val = new Date(val).toISOString();
                    if (!moment(val, moment.ISO_8601, true).isValid()) {
                        throw new Error('Invalid date format.');
                    }
                },
                isAfterStart: function(val) {
                    var start = new Date(this.getDataValue('from')),
                        val = new Date(val);
                    start.setUTCHours(23, 59, 59, 999);
                    val.setUTCHours(23, 59, 59, 999);
                    if (start > val) {
                        throw new Error('Ending date must be after the starting date.');
                    }
                }
            }
        },
        priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        separateGrill: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        state: {
            type: DataTypes.ENUM,
            values: ['draft', 'confirmed', 'rejected', 'finished'],
            allowNull: false,
            defaultValue: 'draft',
            validate: {
                isIn: function(val) {
                    if (['draft', 'confirmed', 'rejected', 'finished'].indexOf(val) === -1) {
                        throw new Error('Invalid reservation state.');
                    }
                }
            }
        }
    }, {
        classMethods: {
            associate: function(models) {
                Reservation.hasOne(models.Rating, {
                    foreignKey: {
                        name: 'reservationId',
                        allowNull: false,
                        unique: true
                    }
                });
                Reservation.belongsToMany(models.Accessory, {
                    foreignKey: {
                        name: 'reservationId',
                        allowNull: false
                    },
                    through: 'reservation_accessory'
                });
            }
        }
    });

    return Reservation;
};
