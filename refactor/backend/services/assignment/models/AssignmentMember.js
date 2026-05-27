'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class AssignmentMember extends Model {
        static associate(models) {
            AssignmentMember.belongsTo(models.Assignment, { foreignKey: 'assignment_id' });
        }
    }

    AssignmentMember.init({
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
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING(50),
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'AssignmentMember',
        tableName: 'assignment_members',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return AssignmentMember;
};
