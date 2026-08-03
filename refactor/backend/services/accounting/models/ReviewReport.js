'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ReviewReport extends Model {
        static associate(models) {}
    }

    ReviewReport.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        // Un solo report salvato per trimestre: l'ultimo calcolato sovrascrive il precedente.
        quarter_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },
        report: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        computed_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'ReviewReport',
        tableName: 'review_reports',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return ReviewReport;
};
