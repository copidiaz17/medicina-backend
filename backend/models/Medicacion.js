import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import { Paciente } from './Paciente.js'

export const Medicacion = sequelize.define('Medicacion', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  nombre:      { type: DataTypes.STRING(150), allowNull: false },
  dosis:       { type: DataTypes.STRING(100), allowNull: true },
  frecuencia:  { type: DataTypes.STRING(100), allowNull: true },
  indicacion:  { type: DataTypes.STRING(200), allowNull: true },
  desde:       { type: DataTypes.DATEONLY, allowNull: true },
  activo:      { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'medicaciones', freezeTableName: true, timestamps: true })

Medicacion.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' })
Paciente.hasMany(Medicacion, { foreignKey: 'paciente_id', as: 'medicaciones' })
