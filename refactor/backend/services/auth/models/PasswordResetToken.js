'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class PasswordResetToken extends Model {
        static associate(models) {
            PasswordResetToken.belongsTo(models.UserProfile, {
                foreignKey: 'user_id',
                as: 'user'
            });
        }
    }

    PasswordResetToken.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'user_profiles', key: 'id' }
        },
        token_hash: {
            type: DataTypes.TEXT,
            allowNull: false,
            unique: true
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        used_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'PasswordResetToken',
        tableName: 'password_reset_tokens',
        underscored: true
    });

    return PasswordResetToken;
};
