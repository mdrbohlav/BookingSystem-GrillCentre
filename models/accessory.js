"use strict";

module.exports = function(sequelize, DataTypes) {
    var Accessory = sequelize.define("Accessory", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        nameEn: {
            type: DataTypes.STRING,
            allowNull: false
        },
        available: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        classMethods: {
            associate: function(models) {
                Accessory.belongsToMany(models.Reservation, {
                    foreignKey: {
                        name: 'accessoryId',
                        allowNull: false
                    },
                    through: 'reservation_accessory'
                });
            }
        }
    });

    return Accessory;
};
