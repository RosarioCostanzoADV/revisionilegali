'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class VigilanzaItem extends Model {
        static associate(models) {}
    }

    VigilanzaItem.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        quarter_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        item: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'generale'
        },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 99
        },
        done: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        completed_by: {
            type: DataTypes.UUID,
            allowNull: true
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'VigilanzaItem',
        tableName: 'vigilanza_items',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return VigilanzaItem;
};
