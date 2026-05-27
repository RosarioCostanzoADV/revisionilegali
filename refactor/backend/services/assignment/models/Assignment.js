'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Assignment extends Model {
        static associate(models) {
            Assignment.hasMany(models.AssignmentMember, { foreignKey: 'assignment_id', as: 'members' });
            Assignment.hasMany(models.Quarter, { foreignKey: 'assignment_id', as: 'quarters' });
        }
    }

    Assignment.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        company_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: { isIn: [['revisione_legale', 'collegio_sindacale', 'sindaco_unico']] }
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
        created_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Assignment',
        tableName: 'assignments',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Assignment;
};
