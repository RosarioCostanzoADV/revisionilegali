'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('assignments', {
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
            company_id: {
                type: Sequelize.UUID,
                allowNull: false
            },
            year: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            type: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            status: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'aperto'
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            created_by: {
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

        await queryInterface.addIndex('assignments', ['tenant_id'], { name: 'assignments_tenant_id_idx' });
        await queryInterface.addIndex('assignments', ['tenant_id', 'company_id'], { name: 'assignments_tenant_company_idx' });
        await queryInterface.addIndex('assignments', ['tenant_id', 'year'], { name: 'assignments_tenant_year_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('assignments');
    }
};
