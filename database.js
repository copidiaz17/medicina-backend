import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
dotenv.config()

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || null,
  {
    host:    process.env.DB_HOST,
    port:    process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max:     10,   // máximo de conexiones simultáneas
      min:     2,    // conexiones mínimas mantenidas
      acquire: 30000, // ms máximos para obtener una conexión antes de lanzar error
      idle:    10000, // ms que una conexión puede estar inactiva antes de liberarse
    },
  }
)
