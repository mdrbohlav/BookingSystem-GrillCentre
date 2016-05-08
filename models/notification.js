'use strict';
module.exports = function(sequelize, DataTypes) {
    var Notification = sequelize.define('Notification', {
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
      defaultScope: {
        where: {
          active: true
        }
      },
      scopes: {
        all: {
          where: {}
        },
        inactive: {
          where: {
            active: false
          }
        }
      }
    });
    return Notification;
};
