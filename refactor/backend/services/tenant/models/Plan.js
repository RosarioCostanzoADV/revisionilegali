'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Plan extends Model {
        static associate(models) {
            Plan.hasMany(models.Tenant, { foreignKey: 'plan_id', as: 'tenants' });
        }
    }

    Plan.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        max_assignments: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        max_users: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        storage_gb: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        ai_quota: {
            type: DataTypes.INTEGER,
            allowNull: true  // NULL = illimitata
        },
        vigilance_module: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        ai_drafts_module: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        advanced_import: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'Plan',
        tableName: 'plans',
        underscored: true
    });

    return Plan;
};
