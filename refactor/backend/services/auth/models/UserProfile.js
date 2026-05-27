'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class UserProfile extends Model {
        static associate(models) {
            UserProfile.hasMany(models.PasswordResetToken, {
                foreignKey: 'user_id',
                as: 'passwordResetTokens'
            });
        }
    }

    UserProfile.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        password_hash: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        tenant_id: {
            type: DataTypes.UUID,
            allowNull: true
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'collaborator',
            validate: {
                isIn: [['super_admin', 'tenant_owner', 'revisor', 'collaborator', 'syndic']]
            }
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        signature_text: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'UserProfile',
        tableName: 'user_profiles',
        underscored: true
    });

    return UserProfile;
};
