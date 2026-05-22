'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Quarter extends Model {
        static associate(models) {
            Quarter.belongsTo(models.Assignment, { foreignKey: 'assignment_id' });
        }
    }

    Quarter.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        assignment_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'assignments', key: 'id' }
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        quarter: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 4 }
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'aperto',
            validate: { isIn: [['aperto', 'in_corso', 'chiuso']] }
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        closed_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Quarter',
        tableName: 'quarters',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Quarter;
};
