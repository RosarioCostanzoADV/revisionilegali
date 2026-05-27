'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('companies', {
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
            name: {
                type: Sequelize.STRING(300),
                allowNull: false
            },
            fiscal_code: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            vat_number: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            sector: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            address: {
                type: Sequelize.STRING(300),
                allowNull: true
            },
            city: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            province: {
                type: Sequelize.STRING(5),
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            is_archived: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
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

        await queryInterface.addIndex('companies', ['tenant_id'], { name: 'companies_tenant_id_idx' });
        await queryInterface.addIndex('companies', ['tenant_id', 'is_archived'], { name: 'companies_tenant_archived_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('companies');
    }
};
