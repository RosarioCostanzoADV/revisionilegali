'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class WorkingPaper extends Model {
        static associate(models) {
            WorkingPaper.hasMany(models.Finding, { foreignKey: 'working_paper_id', as: 'findings' });
        }
    }

    WorkingPaper.init({
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
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        area: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [[
                    'cassa_banche', 'crediti_clienti', 'debiti_fornitori',
                    'immobilizzazioni', 'rimanenze', 'patrimonio_netto',
                    'ricavi', 'costi', 'imposte', 'adempimenti', 'altro'
                ]]
            }
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'bozza',
            validate: { isIn: [['bozza', 'in_revisione', 'approvata']] }
        },
        prepared_by: {
            type: DataTypes.UUID,
            allowNull: true
        },
        reviewed_by: {
            type: DataTypes.UUID,
            allowNull: true
        },
        reviewed_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'WorkingPaper',
        tableName: 'working_papers',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return WorkingPaper;
};
