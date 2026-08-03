'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('review_reports', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false
            },
            tenant_id: {
                type: Sequelize.UUID,
                allowNull: false
            },
            quarter_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true
            },
            report: {
                type: Sequelize.JSONB,
                allowNull: false
            },
            computed_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()')
            }
        });

        await queryInterface.addIndex('review_reports', ['tenant_id'], { name: 'review_reports_tenant_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('review_reports');
    }
};
