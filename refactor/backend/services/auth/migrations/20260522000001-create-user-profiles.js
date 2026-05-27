'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('user_profiles', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            password_hash: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            tenant_id: {
                type: Sequelize.UUID,
                allowNull: true
            },
            role: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'collaborator'
            },
            full_name: {
                type: Sequelize.STRING,
                allowNull: true
            },
            phone: {
                type: Sequelize.STRING,
                allowNull: true
            },
            signature_text: {
                type: Sequelize.TEXT,
                allowNull: true
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

        await queryInterface.addIndex('user_profiles', ['email'], { unique: true });
        await queryInterface.addIndex('user_profiles', ['tenant_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('user_profiles');
    }
};
