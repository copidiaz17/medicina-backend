import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import { Consulta } from './Consulta.js'

export const ConsultaIA = sequelize.define('ConsultaIA', {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  consulta_id:  { type: DataTypes.INTEGER, allowNull: false },
  respuesta:    { type: DataTypes.TEXT('long'), allowNull: false },
  tokens_input: { type: DataTypes.INTEGER, allowNull: true },
  tokens_output:{ type: DataTypes.INTEGER, allowNull: true },
  historial:    { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
}, { tableName: 'consultas_ia', freezeTableName: true, timestamps: true })

ConsultaIA.belongsTo(Consulta, { foreignKey: 'consulta_id', as: 'consulta' })
Consulta.hasOne(ConsultaIA, { foreignKey: 'consulta_id', as: 'respuestaIA' })
