import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import { Archivo } from './Archivo.js'

export const AnalisisImagen = sequelize.define('AnalisisImagen', {
  id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  archivo_id:     { type: DataTypes.INTEGER, allowNull: false, unique: true },
  hallazgos:      { type: DataTypes.TEXT('long'), allowNull: false },
  tokens_entrada: { type: DataTypes.INTEGER, allowNull: true },
  tokens_salida:  { type: DataTypes.INTEGER, allowNull: true },
  modelo:         { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'analisis_imagenes', freezeTableName: true, timestamps: true })

AnalisisImagen.belongsTo(Archivo, { foreignKey: 'archivo_id', as: 'archivo' })
Archivo.hasOne(AnalisisImagen, { foreignKey: 'archivo_id', as: 'analisis' })
