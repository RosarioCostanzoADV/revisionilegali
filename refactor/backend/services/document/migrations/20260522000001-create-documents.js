'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('documents', {
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
            name: {
                type: Sequelize.STRING(300),
                allowNull: false
            },
            file_path: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            file_size: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            mime_type: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            category: {
                type: Sequelize.STRING(50),
                allowNull: false,
                defaultValue: 'altro'
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            uploaded_by: {
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

        await queryInterface.addIndex('documents', ['quarter_id'], { name: 'docs_quarter_idx' });
        await queryInterface.addIndex('documents', ['tenant_id'], { name: 'docs_tenant_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('documents');
    }
};
