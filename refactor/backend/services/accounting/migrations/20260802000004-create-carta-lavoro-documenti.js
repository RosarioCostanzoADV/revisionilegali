'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('carta_lavoro_documenti', {
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
            html: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            updated_by: {
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

        await queryInterface.addIndex('carta_lavoro_documenti', ['tenant_id'], { name: 'carta_lavoro_documenti_tenant_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('carta_lavoro_documenti');
    }
};
