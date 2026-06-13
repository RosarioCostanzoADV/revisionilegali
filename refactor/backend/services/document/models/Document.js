'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Document extends Model {
        static associate(models) {}
    }

    Document.init({
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
            allowNull: true
        },
        quarter_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        name: {
            type: DataTypes.STRING(300),
            allowNull: false
        },
        file_path: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        file_size: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        mime_type: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'altro'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        uploaded_by: {
            type: DataTypes.UUID,
            allowNull: true
        },
        owns_file: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'Document',
        tableName: 'documents',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return Document;
};
