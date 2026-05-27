'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('vigilanza_items', {
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
            item: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            category: {
                type: Sequelize.STRING(50),
                allowNull: false,
                defaultValue: 'generale'
            },
            sort_order: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 99
            },
            done: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            completed_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            completed_at: {
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

        await queryInterface.addIndex('vigilanza_items', ['quarter_id'], { name: 'vigilanza_quarter_idx' });
        await queryInterface.addIndex('vigilanza_items', ['tenant_id'], { name: 'vigilanza_tenant_idx' });
        await queryInterface.addIndex('vigilanza_items', ['quarter_id', 'sort_order'], { name: 'vigilanza_quarter_order_idx' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('vigilanza_items');
    }
};
