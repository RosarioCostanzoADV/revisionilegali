'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('accounting_entries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      import_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'accounting_imports',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      account_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      account_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      balance_prev: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      pdf_section: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      voce_bilancio: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      voce_bilancio_code: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      mapped_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('accounting_entries', ['tenant_id']);
    await queryInterface.addIndex('accounting_entries', ['import_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('accounting_entries');
  },
};
