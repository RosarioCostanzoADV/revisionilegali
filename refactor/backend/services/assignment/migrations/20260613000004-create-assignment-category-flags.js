'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('assignment_category_flags', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false,
            },
            tenant_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            assignment_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            category_slug: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            is_na: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
        });

        await queryInterface.addIndex('assignment_category_flags', ['assignment_id', 'category_slug'], {
            unique: true,
            name: 'cat_flags_unique_idx',
        });
        await queryInterface.addIndex('assignment_category_flags', ['tenant_id'], {
            name: 'cat_flags_tenant_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('assignment_category_flags');
    },
};
