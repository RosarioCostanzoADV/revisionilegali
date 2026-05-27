'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('working_papers', {
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
                allowNull: false
            },
            title: {
                type: Sequelize.STRING(200),
                allowNull: false
            },
            area: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            status: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'bozza'
            },
            prepared_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            reviewed_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            reviewed_at: {
                type: Sequelize.DATE,
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

        await queryInterface.addIndex('working_papers', ['quarter_id'], { name: 'wp_quarter_idx' });
        await queryInterface.addIndex('working_papers', ['tenant_id'], { name: 'wp_tenant_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('working_papers');
    }
};
