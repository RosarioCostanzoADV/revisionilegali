'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AccountingImport = sequelize.define('AccountingImport', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    assignment_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quarter_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    file_name: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING(20), // csv, xlsx, pdf
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'error'),
      defaultValue: 'pending',
      allowNull: false,
    },
    entry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imported_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'accounting_imports',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  AccountingImport.associate = (models) => {
    AccountingImport.hasMany(models.AccountingEntry, {
      foreignKey: 'import_id',
      as: 'entries',
      onDelete: 'CASCADE',
    });
  };

  return AccountingImport;
};
