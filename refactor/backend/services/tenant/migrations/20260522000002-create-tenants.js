'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('tenants', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            referent_name: {
                type: Sequelize.STRING,
                allowNull: true
            },
            phone: {
                type: Sequelize.STRING,
                allowNull: true
            },
            vat_number: {
                type: Sequelize.STRING,
                allowNull: true
            },
            timezone: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'Europe/Rome'
            },
            logo_url: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            status: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'active'
            },
            plan_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: 'plans', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            plan_expires_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            onboarding_completed: {
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

        await queryInterface.addIndex('tenants', ['status']);
        await queryInterface.addIndex('tenants', ['plan_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('tenants');
    }
};
