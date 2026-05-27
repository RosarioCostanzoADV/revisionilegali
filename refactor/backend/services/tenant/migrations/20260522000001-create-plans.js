'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('plans', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            max_assignments: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            max_users: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            storage_gb: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            ai_quota: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            vigilance_module: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            ai_drafts_module: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            advanced_import: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
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
    },

    async down(queryInterface) {
        await queryInterface.dropTable('plans');
    }
};
