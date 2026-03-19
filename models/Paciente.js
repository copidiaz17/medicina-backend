import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'

export const Paciente = sequelize.define('Paciente', {
  id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  doctor_id:        { type: DataTypes.INTEGER, allowNull: true },   // FK a usuarios.id — null = legacy
  nombre:           { type: DataTypes.STRING(100), allowNull: false },
  apellido:         { type: DataTypes.STRING(100), allowNull: false },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
  sexo:             { type: DataTypes.ENUM('masculino', 'femenino', 'otro'), allowNull: true },
  dni:              { type: DataTypes.STRING(20), allowNull: true },
  telefono:         { type: DataTypes.STRING(30), allowNull: true },
  email:            { type: DataTypes.STRING(150), allowNull: true },
  grupo_sanguineo:  { type: DataTypes.STRING(10), allowNull: true },
  peso_kg:          { type: DataTypes.DECIMAL(5, 1), allowNull: true },
  talla_cm:         { type: DataTypes.DECIMAL(5, 1), allowNull: true },
  obra_social:      { type: DataTypes.STRING(100), allowNull: true },
  nro_afiliado:     { type: DataTypes.STRING(50), allowNull: true },
  activo:           { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'pacientes', freezeTableName: true, timestamps: true })
