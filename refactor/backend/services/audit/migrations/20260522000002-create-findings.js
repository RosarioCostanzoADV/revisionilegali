'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('findings', {
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
            working_paper_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: 'working_papers', key: 'id' },
                onDelete: 'SET NULL'
            },
            title: {
                type: Sequelize.STRING(300),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            recommendation: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            severity: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'media'
            },
            status: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'aperto'
            },
            response: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            due_date: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            closed_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            raised_by: {
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

        await queryInterface.addIndex('findings', ['quarter_id'], { name: 'findings_quarter_idx' });
        await queryInterface.addIndex('findings', ['tenant_id'], { name: 'findings_tenant_idx' });
        await queryInterface.addIndex('findings', ['working_paper_id'], { name: 'findings_wp_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('findings');
    }
};
