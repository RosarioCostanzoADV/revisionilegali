'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AccountingEntry = sequelize.define('AccountingEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    import_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    account_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    account_name: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    balance_prev: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    pdf_section: {
      type: DataTypes.STRING(20), // SP_A, SP_P, CE_R, CE_C, CE, null
      allowNull: true,
    },
    // Mappatura AI — aggiornata dall'ai-service
    voce_bilancio: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    voce_bilancio_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    mapped_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'accounting_entries',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  AccountingEntry.associate = (models) => {
    AccountingEntry.belongsTo(models.AccountingImport, {
      foreignKey: 'import_id',
      as: 'import',
    });
  };

  return AccountingEntry;
};
