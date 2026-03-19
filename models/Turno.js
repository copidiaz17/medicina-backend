import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import { Paciente } from './Paciente.js'

const Turno = sequelize.define('Turno', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  paciente_id: { type: DataTypes.INTEGER, allowNull: false },
  doctor_id:   { type: DataTypes.INTEGER, allowNull: false },
  fecha:       { type: DataTypes.DATEONLY, allowNull: false },
  hora:        { type: DataTypes.STRING(5), allowNull: false },   // "09:30"
  motivo:      { type: DataTypes.STRING(255), allowNull: true },
  estado:      { type: DataTypes.ENUM('pendiente', 'confirmado', 'cancelado', 'realizado'), allowNull: false, defaultValue: 'pendiente' },
  notas:       { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'turnos', freezeTableName: true, timestamps: true })

Turno.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' })
Paciente.hasMany(Turno, { foreignKey: 'paciente_id', as: 'turnos' })

export { Turno }
export default Turno
