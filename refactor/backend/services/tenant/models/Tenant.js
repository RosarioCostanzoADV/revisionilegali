'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Tenant extends Model {
        static associate(models) {
            Tenant.belongsTo(models.Plan, { foreignKey: 'plan_id', as: 'plan' });
        }
    }

    Tenant.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        referent_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        vat_number: {
            type: DataTypes.STRING,
            allowNull: true
        },
        timezone: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Europe/Rome'
        },
        logo_url: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'active',
            validate: { isIn: [['active', 'suspended', 'trial']] }
        },
        plan_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'plans', key: 'id' }
        },
        plan_expires_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        onboarding_completed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        sequelize,
        modelName: 'Tenant',
        tableName: 'tenants',
        underscored: true
    });

    return Tenant;
};
