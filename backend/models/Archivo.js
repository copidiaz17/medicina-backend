import { DataTypes } from 'sequelize'
import { sequelize } from '../database.js'
import { Consulta } from './Consulta.js'

export const Archivo = sequelize.define('Archivo', {
  id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  consulta_id:      { type: DataTypes.INTEGER, allowNull: false },
  nombre_original:  { type: DataTypes.STRING(255), allowNull: false },
  nombre_archivo:   { type: DataTypes.STRING(255), allowNull: false },
  tipo_mime:        { type: DataTypes.STRING(100), allowNull: false },
  tamano:           { type: DataTypes.INTEGER, allowNull: true },
  categoria:        {
    type: DataTypes.ENUM('laboratorio', 'ecg', 'radiologia', 'ecografia', 'resonancia', 'tomografia', 'otro'),
    defaultValue: 'otro'
  },
  descripcion:      { type: DataTypes.STRING(255), allowNull: true },
  contenido:        { type: DataTypes.TEXT('long'), allowNull: true },
  // Almacenamiento en Cloudinary (reemplaza el disco efímero de Render)
  public_id:        { type: DataTypes.STRING(255), allowNull: true },
  resource_type:    { type: DataTypes.STRING(20),  allowNull: true },
}, { tableName: 'archivos', freezeTableName: true, timestamps: true })

Archivo.belongsTo(Consulta, { foreignKey: 'consulta_id', as: 'consulta' })
Consulta.hasMany(Archivo, { foreignKey: 'consulta_id', as: 'archivos' })
