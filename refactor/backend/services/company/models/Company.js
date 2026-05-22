'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Company extends Model {
        static associate(models) {}
    }

    Company.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(300),
            allowNull: false
        },
        fiscal_code: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        vat_number: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        sector: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        address: {
            type: DataTypes.STRING(300),
            allowNull: true
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        province: {
            type: DataTypes.STRING(5),
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        is_archived: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        sequelize,
        modelName: 'Company',
        tableName: 'companies',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Company;
};
