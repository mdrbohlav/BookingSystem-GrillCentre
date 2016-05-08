'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.addColumn(
            'Users',
            'lastLogin', {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: "1970-01-01T00:00:00.001Z"
            }
        );
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.removeColumn('Users', 'lastLogin');
    }
};
