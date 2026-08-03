'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class CartaLavoroDocumento extends Model {
        static associate(models) {}
    }

    CartaLavoroDocumento.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        // Una sola versione modificata salvata per trimestre: l'ultimo salvataggio
        // sovrascrive il precedente (come review_reports).
        quarter_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },
        // HTML della carta di lavoro dopo le modifiche manuali del revisore.
        html: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'CartaLavoroDocumento',
        tableName: 'carta_lavoro_documenti',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return CartaLavoroDocumento;
};
