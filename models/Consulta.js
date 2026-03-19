import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import { Paciente } from './Paciente.js'

export const Consulta = sequelize.define('Consulta', {
  id:                    { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  paciente_id:           { type: DataTypes.INTEGER, allowNull: false },
  fecha:                 { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  motivo:                { type: DataTypes.TEXT, allowNull: false },
  sintomas_actuales:     { type: DataTypes.TEXT, allowNull: true },
  presion_arterial:      { type: DataTypes.STRING(20), allowNull: true },
  frecuencia_cardiaca:   { type: DataTypes.INTEGER, allowNull: true },
  frecuencia_respiratoria: { type: DataTypes.INTEGER, allowNull: true },
  temperatura:           { type: DataTypes.DECIMAL(4, 1), allowNull: true },
  saturacion_o2:         { type: DataTypes.INTEGER, allowNull: true },
  peso_kg:               { type: DataTypes.DECIMAL(5, 1), allowNull: true },
  ecg_descripcion:       { type: DataTypes.TEXT, allowNull: true },
  estudios_realizados:   { type: DataTypes.TEXT, allowNull: true },
  notas_clinicas:        { type: DataTypes.TEXT, allowNull: true },
  diagnostico_medico:    { type: DataTypes.TEXT, allowNull: true },
  tratamiento:           { type: DataTypes.TEXT, allowNull: true },
  proxima_consulta:      { type: DataTypes.DATEONLY, allowNull: true },
}, { tableName: 'consultas', freezeTableName: true, timestamps: true })

Consulta.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' })
Paciente.hasMany(Consulta, { foreignKey: 'paciente_id', as: 'consultas' })
