'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Finding extends Model {
        static associate(models) {
            Finding.belongsTo(models.WorkingPaper, { foreignKey: 'working_paper_id', as: 'workingPaper' });
        }
    }

    Finding.init({
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
        working_paper_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        title: {
            type: DataTypes.STRING(300),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        recommendation: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        severity: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'media',
            validate: { isIn: [['bassa', 'media', 'alta', 'critica']] }
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'aperto',
            validate: { isIn: [['aperto', 'in_gestione', 'risolto', 'chiuso']] }
        },
        response: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        due_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        closed_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        raised_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Finding',
        tableName: 'findings',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Finding;
};
