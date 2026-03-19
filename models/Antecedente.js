import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import { Paciente } from './Paciente.js'

export const Antecedente = sequelize.define('Antecedente', {
  id:                     { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  paciente_id:            { type: DataTypes.INTEGER, allowNull: false },
  antecedentes_familiares:{ type: DataTypes.TEXT, allowNull: true },
  patologias_previas:     { type: DataTypes.TEXT, allowNull: true },
  alergias:               { type: DataTypes.TEXT, allowNull: true },
  cirugias_previas:       { type: DataTypes.TEXT, allowNull: true },
  tabaco:                 { type: DataTypes.STRING(30), defaultValue: 'no_fumador' },
  alcohol:                { type: DataTypes.STRING(20), defaultValue: 'no' },
  actividad_fisica:       { type: DataTypes.STRING(20), defaultValue: 'sedentario' },
  otros_habitos:          { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'antecedentes', freezeTableName: true, timestamps: true })

Antecedente.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' })
Paciente.hasOne(Antecedente, { foreignKey: 'paciente_id', as: 'antecedente' })
