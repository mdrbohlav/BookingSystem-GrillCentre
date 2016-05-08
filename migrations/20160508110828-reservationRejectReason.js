'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.addColumn(
            'Reservations',
            'rejectReason', {
                type: Sequelize.TEXT,
                allowNull: true
            }
        );
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.removeColumn('Reservations', 'rejectReason');
    }
};
