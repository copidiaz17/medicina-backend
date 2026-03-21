import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import dotenv from 'dotenv'
dotenv.config()

// ── Validación de variables de entorno requeridas ──────────────
const REQUIRED_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET', 'ANTHROPIC_API_KEY']
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length) {
  console.error(`✗ Faltan variables de entorno: ${missing.join(', ')}`)
  console.error('  Copiá backend/.env.example a backend/.env y completá los valores.')
  process.exit(1)
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('✗ JWT_SECRET demasiado corto. Debe tener al menos 32 caracteres.')
  console.error('  Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
  process.exit(1)
}
if (!process.env.FRONTEND_URL && process.env.NODE_ENV === 'production') {
  console.warn('⚠ FRONTEND_URL no configurado. CORS puede rechazar requests del frontend.')
}

const __dirname = dirname(fileURLToPath(import.meta.url))

import { sequelize } from './database.js'

// Modelos
import './models/Usuario.js'
import './models/Paciente.js'
import './models/Antecedente.js'
import './models/Medicacion.js'
import './models/Consulta.js'
import './models/ConsultaIA.js'
import './models/Archivo.js'
import './models/Turno.js'

// Rutas
import authRouter      from './routes/auth.js'
import pacientesRouter from './routes/pacientes.js'
import consultasRouter from './routes/consultas.js'
import claudeRouter    from './routes/claude.js'
import usuariosRouter  from './routes/usuarios.js'
import archivosRouter  from './routes/archivos.js'
import dashboardRouter from './routes/dashboard.js'
import turnosRouter    from './routes/turnos.js'

const app = express()
const PORT = process.env.PORT || 3001
const IS_PROD = process.env.NODE_ENV === 'production'

// ── Trust proxy (Render / cualquier reverse proxy) ─────────────
app.set('trust proxy', 1)

// ── Seguridad: headers HTTP ────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
}))

// ── Compresión gzip ────────────────────────────────────────────
app.use(compression())

// ── CORS ───────────────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:5174', 'http://localhost:5173']

app.use(cors({
  origin: (origin, cb) => {
    // Permitir requests sin origin (curl, Postman, mismo servidor)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origen no permitido — ${origin}`))
  },
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

// ── Rate limiting ──────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas solicitudes. Intentá de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const claudeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Límite de consultas IA alcanzado. Intentá de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', apiLimiter)
app.use('/api/auth/login', loginLimiter)
app.use('/api/claude', claudeLimiter)

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/auth',      authRouter)
app.use('/api/pacientes', pacientesRouter)
app.use('/api/consultas', consultasRouter)
app.use('/api/claude',    claudeRouter)
app.use('/api/usuarios',  usuariosRouter)
app.use('/api/archivos',  archivosRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/turnos',    turnosRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Medicina IA API', env: IS_PROD ? 'production' : 'development', version: 'v2-memoryStorage-20260321' }))
app.get('/api/config', (_req, res) => res.json({ whatsapp: !!(process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN) }))

// ── Error handler global (no expone detalles en producción) ────
app.use((err, req, res, _next) => {
  const status = err.status || 500
  const message = IS_PROD && status === 500
    ? 'Error interno del servidor'
    : err.message
  if (status === 500) console.error('[ERROR]', err)
  res.status(status).json({ error: message })
})

// ── Inicio ─────────────────────────────────────────────────────
async function start() {
  try {
    await sequelize.authenticate()
    console.log('✓ MySQL conectado')
    // En producción no usar alter:true (puede romper datos). Usá migraciones.
    await sequelize.sync({ alter: !IS_PROD })
    console.log('✓ Tablas sincronizadas')
    // Migración: agregar columna contenido si no existe (compatible con MySQL 5.7+)
    const [cols] = await sequelize.query("SHOW COLUMNS FROM archivos LIKE 'contenido'")
    if (cols.length === 0) {
      await sequelize.query("ALTER TABLE archivos ADD COLUMN contenido LONGTEXT NULL")
      console.log('✓ Migración: columna contenido agregada a archivos')
    }
    app.listen(PORT, () => console.log(`🩺 Medicina IA corriendo en http://localhost:${PORT} [${IS_PROD ? 'PROD' : 'DEV'}]`))
  } catch (err) {
    console.error('✗ Error al iniciar:', err.message)
    process.exit(1)
  }
}

start()
