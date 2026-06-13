'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('documents', 'assignment_id', {
            type: Sequelize.UUID,
            allowNull: true,
        });

        await queryInterface.changeColumn('documents', 'quarter_id', {
            type: Sequelize.UUID,
            allowNull: true,
        });

        await queryInterface.addColumn('documents', 'owns_file', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        });

        await queryInterface.addIndex('documents', ['assignment_id'], { name: 'docs_assignment_idx' });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('documents', 'docs_assignment_idx');
        await queryInterface.removeColumn('documents', 'owns_file');
        await queryInterface.changeColumn('documents', 'quarter_id', {
            type: Sequelize.UUID,
            allowNull: false,
        });
        await queryInterface.removeColumn('documents', 'assignment_id');
    },
};
