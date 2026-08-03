'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('riscontro_note', {
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
            codice: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            nota: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            esito: {
                type: Sequelize.STRING(50),
                allowNull: true
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

        await queryInterface.addIndex('riscontro_note', ['quarter_id'], { name: 'riscontro_note_quarter_idx' });
        await queryInterface.addIndex('riscontro_note', ['tenant_id'], { name: 'riscontro_note_tenant_idx' });
        await queryInterface.addIndex('riscontro_note', ['quarter_id', 'codice'], {
            name: 'riscontro_note_quarter_codice_uniq',
            unique: true
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('riscontro_note');
    }
};
