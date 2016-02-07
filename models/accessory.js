"use strict";

module.exports = function(sequelize, DataTypes) {
    var Accessory = sequelize.define("Accessory", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        available: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    });

    return Accessory;
};
