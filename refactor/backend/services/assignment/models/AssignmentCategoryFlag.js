'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AssignmentCategoryFlag extends Model {
        static associate(models) {
            AssignmentCategoryFlag.belongsTo(models.Assignment, {
                foreignKey: 'assignment_id',
                as: 'assignment'
            });
        }
    }

    AssignmentCategoryFlag.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        assignment_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        category_slug: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        is_na: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'AssignmentCategoryFlag',
        tableName: 'assignment_category_flags',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return AssignmentCategoryFlag;
};
