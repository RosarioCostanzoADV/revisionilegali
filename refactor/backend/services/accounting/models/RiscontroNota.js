'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class RiscontroNota extends Model {
        static associate(models) {}
    }

    RiscontroNota.init({
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
        // Codice del riscontro (es. '4923013'), come in Riscontro.codice del report.
        codice: {
            type: DataTypes.STRING(50),
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
        modelName: 'RiscontroNota',
        tableName: 'riscontro_note',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return RiscontroNota;
};
