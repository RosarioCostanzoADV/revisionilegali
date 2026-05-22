'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('password_reset_tokens', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'user_profiles', key: 'id' },
                onDelete: 'CASCADE'
            },
            token_hash: {
                type: Sequelize.TEXT,
                allowNull: false,
                unique: true
            },
            expires_at: {
                type: Sequelize.DATE,
                allowNull: false
            },
            used_at: {
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

        await queryInterface.addIndex('password_reset_tokens', ['token_hash'], { unique: true });
        await queryInterface.addIndex('password_reset_tokens', ['user_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('password_reset_tokens');
    }
};
