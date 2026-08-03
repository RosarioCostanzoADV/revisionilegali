'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SaluteNota extends Model {
        static associate(models) {}
    }

    SaluteNota.init({
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
        // Es. 'Redditività' · 'Equilibrio commerciale' · 'Struttura finanziaria'
        // (i valori di `dimensione` prodotti da lib/saluteAzienda.js).
        indicatore: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        nota: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // 'segnalazione_inviata' | 'anomalia_non_riscontrata'
        esito: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'SaluteNota',
        tableName: 'salute_note',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return SaluteNota;
};
