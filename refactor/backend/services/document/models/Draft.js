'use strict';
const { Model } = require('sequelize');

const DRAFT_TYPES = ['relazione_revisione', 'lettera_direzione', 'verbale_collegio', 'verbale_sindaco', 'altro'];

module.exports = (sequelize, DataTypes) => {
    class Draft extends Model {
        static associate(models) {}
    }

    Draft.init({
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
        quarter_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        title: {
            type: DataTypes.STRING(300),
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: { isIn: [DRAFT_TYPES] }
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'bozza',
            validate: { isIn: [['bozza', 'definitivo']] }
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Draft',
        tableName: 'drafts',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Draft;
};
