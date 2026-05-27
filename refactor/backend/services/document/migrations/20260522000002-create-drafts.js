'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('drafts', {
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
            assignment_id: {
                type: Sequelize.UUID,
                allowNull: false
            },
            quarter_id: {
                type: Sequelize.UUID,
                allowNull: true
            },
            title: {
                type: Sequelize.STRING(300),
                allowNull: false
            },
            type: {
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

        await queryInterface.addIndex('drafts', ['assignment_id'], { name: 'drafts_assignment_idx' });
        await queryInterface.addIndex('drafts', ['quarter_id'], { name: 'drafts_quarter_idx' });
        await queryInterface.addIndex('drafts', ['tenant_id'], { name: 'drafts_tenant_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('drafts');
    }
};
