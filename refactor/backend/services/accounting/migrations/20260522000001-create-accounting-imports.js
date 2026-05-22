'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('accounting_imports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      assignment_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      quarter_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      file_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      file_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'error'),
        defaultValue: 'pending',
        allowNull: false,
      },
      entry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      imported_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('accounting_imports', ['tenant_id']);
    await queryInterface.addIndex('accounting_imports', ['assignment_id']);
    await queryInterface.addIndex('accounting_imports', ['quarter_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('accounting_imports');
  },
};
