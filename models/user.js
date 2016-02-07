"use strict";

module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define("User", {
        sessionId: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        roles: {
            type: DataTypes.ARRAY(DataTypes.STRING(16)),
            defaultValue: ['Member'],
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                isEmail: {
                    msg: 'Invalid email address.'
                }
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        firstname: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastname: {
            type: DataTypes.STRING,
            allowNull: false
        },
        block: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                isBlock: function(val) {
                    if (val > 12 || val < 1) {
                        throw new Error('Invald block number.');
                    }
                }
            }
        },
        room: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isRoom: function(val) {
                    var floor = val.length === 2 ? null : parseInt(parseInt(val) / 100),
                        room = parseInt(val) % 100,
                        valid = floor === null ? room < 55 ? true : false : floor === 0 ? room < 60 ? true : false : room < 43 ? true : false;
                    if (!valid) {
                        throw new Error('Invalid room number.');
                    }
                }
            }
        },
        isId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            unique: true
        },
        locale: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: 'cs_CZ',
        }
    }, {
        classMethods: {
            associate: function(models) {
                User.hasMany(models.Reservation, {
                    foreignKey: {
                        name: 'userId',
                        allowNull: false
                    }
                });
                User.hasMany(models.Rating, {
                    foreignKey: {
                        name: 'userId',
                        allowNull: false
                    }
                });
            }
        },
        getterMethods: {
            fullName: function() {
                return this.firstname + ' ' + this.lastname
            }
        }
    });

    return User;
};
