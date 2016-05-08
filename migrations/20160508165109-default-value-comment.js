'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.changeColumn(
            'Reservations',
            'comment', {
                type: Sequelize.TEXT,
                allowNull: true,
                defaultValue: ''
            }
        );
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.changeColumn(
            'Reservations',
            'comment', {
                type: Sequelize.TEXT,
                allowNull: true,
                defaultValue: null
            }
        );
    }
};
