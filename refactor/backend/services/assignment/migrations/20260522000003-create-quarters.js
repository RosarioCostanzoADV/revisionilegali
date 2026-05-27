'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('quarters', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false
            },
            assignment_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'assignments', key: 'id' },
                onDelete: 'CASCADE'
            },
            tenant_id: {
                type: Sequelize.UUID,
                allowNull: false
            },
            quarter: {
                type: Sequelize.INTEGER,
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
            closed_at: {
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

        await queryInterface.addIndex('quarters', ['assignment_id'], { name: 'quarters_assignment_idx' });
        await queryInterface.addIndex('quarters', ['tenant_id'], { name: 'quarters_tenant_idx' });
        await queryInterface.addIndex('quarters', ['assignment_id', 'quarter'], {
            name: 'quarters_assignment_quarter_unique',
            unique: true
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('quarters');
    }
};
