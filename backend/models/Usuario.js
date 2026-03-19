import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

export const Usuario = sequelize.define('Usuario', {
  id:       { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre:   { type: DataTypes.STRING(100), allowNull: false },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  rol:      { type: DataTypes.ENUM('medico', 'admin', 'secretaria'), defaultValue: 'medico' },
  activo:   { type: DataTypes.BOOLEAN, defaultValue: true },
  // null = ilimitado, número = máximo de consultas IA por mes
  consultas_ia_limite: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 400 },
  // Solo para rol 'secretaria': id del médico al que pertenece
  medico_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  // Perfil demo: límite reducido + modal de suscripción al agotar IA
  demo: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'usuarios', freezeTableName: true, timestamps: true })
