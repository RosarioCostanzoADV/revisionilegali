'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('assignment_members', {
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
            user_id: {
                type: Sequelize.UUID,
                allowNull: false
            },
            role: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()')
            }
        });

        await queryInterface.addIndex('assignment_members', ['assignment_id'], { name: 'assignment_members_assignment_idx' });
        await queryInterface.addIndex('assignment_members', ['assignment_id', 'user_id'], {
            name: 'assignment_members_unique',
            unique: true
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('assignment_members');
    }
};
