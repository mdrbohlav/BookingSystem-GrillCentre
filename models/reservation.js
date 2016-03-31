"use strict";

var moment = require('moment');

module.exports = function(sequelize, DataTypes) {
    var Reservation = sequelize.define("Reservation", {
        from: {
            type: DataTypes.DATE,
            allowNull: false,
            validate: {
                isDate: function(val) {
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
                isDate: function(val) {
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
        pickup: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isTime: function(val) {
                    if (val < 0 || val > 23 * 60 + 59) {
                        throw new Error('Invalid pickup time.');
                    }
                }
            }
        },
        mobileGrill: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        onlyMobileGrill: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        state: {
            type: DataTypes.ENUM,
            values: ['draft', 'confirmed', 'rejected', 'canceled', 'finished'],
            allowNull: false,
            defaultValue: 'draft',
            validate: {
                isIn: function(val) {
                    if (['draft', 'confirmed', 'rejected', 'canceled', 'finished'].indexOf(val) === -1) {
                        throw new Error('Invalid reservation state.');
                    }
                }
            }
        },
        stateChangedBy: {
            type: DataTypes.INTEGER,
            allowNull: true
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
