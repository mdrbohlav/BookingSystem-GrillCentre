"use strict";

module.exports = function(sequelize, DataTypes) {
    var Rating = sequelize.define("Rating", {
        value: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    });

    return Rating;
};
