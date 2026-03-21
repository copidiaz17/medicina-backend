import { Router } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { authMiddleware } from '../middleware/auth.js'
import { Archivo } from '../models/Archivo.js'
import { Consulta } from '../models/Consulta.js'
import { Paciente } from '../models/Paciente.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../uploads')
const IS_PROD = process.env.NODE_ENV === 'production'

const router = Router()
router.use(authMiddleware)

// ─── Helper: verifica que el archivo pertenece al doctor autenticado ──
async function verificarOwnerArchivo(archivoId, userId) {
  const archivo = await Archivo.findByPk(archivoId, {
    include: [{
      model: Consulta,
      as: 'consulta',
      include: [{ model: Paciente, as: 'paciente', attributes: ['doctor_id'] }],
    }],
  })
  if (!archivo) return null
  if (archivo.consulta.paciente.doctor_id !== userId) return null
  return archivo
}

// ─── Helper: verifica que la consulta pertenece al doctor autenticado ──
async function verificarOwnerConsulta(consultaId, userId) {
  const consulta = await Consulta.findByPk(consultaId, {
    include: [{ model: Paciente, as: 'paciente', attributes: ['doctor_id'] }],
  })
  if (!consulta) return null
  if (consulta.paciente.doctor_id !== userId) return null
  return consulta
}

// ─── Multer config (memoryStorage: sin dependencia del filesystem) ──
const TIPOS_PERMITIDOS = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'application/dicom',
]

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype.split(';')[0].trim()
    if (TIPOS_PERMITIDOS.includes(mime)) return cb(null, true)
    const ext = path.extname(file.originalname).toLowerCase()
    const extsPermitidas = ['.jpg','.jpeg','.png','.gif','.webp','.pdf','.dcm','.txt','.xlsx','.xls']
    if (extsPermitidas.includes(ext)) return cb(null, true)
    cb(new Error('Tipo de archivo no permitido'))
  },
})

// ─── Detectar categoría por mimetype/extensión ───────────────────
function detectarCategoria(mimetype, nombre) {
  const ext = path.extname(nombre).toLowerCase()
  if (['.dcm'].includes(ext)) return 'radiologia'
  if (mimetype.startsWith('image/')) return 'ecografia'
  if (mimetype === 'application/pdf') return 'otro'
  return 'otro'
}

function errMsg(err) {
  return IS_PROD ? 'Error interno del servidor' : err.message
}

// ─── GET /api/archivos/consulta/:consultaId ───────────────────────
router.get('/consulta/:consultaId', async (req, res) => {
  try {
    const consulta = await verificarOwnerConsulta(req.params.consultaId, req.user.id)
    if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada o acceso denegado' })

    const archivos = await Archivo.findAll({
      where: { consulta_id: req.params.consultaId },
      order: [['createdAt', 'DESC']],
    })
    res.json(archivos)
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

// ─── POST /api/archivos/consulta/:consultaId ─────────────────────
router.post('/consulta/:consultaId', upload.array('archivos', 20), async (req, res) => {
  try {
    const consulta = await verificarOwnerConsulta(req.params.consultaId, req.user.id)
    if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada o acceso denegado' })

    const { categoria, descripcion } = req.body
    const creados = []
    for (const file of req.files) {
      const mime = file.mimetype.split(';')[0].trim()
      const ext  = path.extname(file.originalname).toLowerCase()
      const cat  = categoria || detectarCategoria(mime, file.originalname)
      const nombre_archivo = `${uuidv4()}${ext}`

      let contenido = null
      if (mime === 'text/plain' || ext === '.txt') {
        contenido = file.buffer.toString('utf8')
      } else {
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
        fs.writeFileSync(join(UPLOADS_DIR, nombre_archivo), file.buffer)
      }

      const a = await Archivo.create({
        consulta_id:     req.params.consultaId,
        nombre_original: file.originalname,
        nombre_archivo,
        tipo_mime:       mime,
        tamano:          file.size,
        categoria:       cat,
        descripcion:     descripcion || '',
        contenido,
      })
      creados.push(a)
    }
    res.status(201).json(creados)
  } catch (err) {
    res.status(400).json({ error: errMsg(err) })
  }
})

// ─── PUT /api/archivos/:id ────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const archivo = await verificarOwnerArchivo(req.params.id, req.user.id)
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado o acceso denegado' })
    await archivo.update({ categoria: req.body.categoria, descripcion: req.body.descripcion })
    res.json(archivo)
  } catch (err) { res.status(400).json({ error: errMsg(err) }) }
})

// ─── DELETE /api/archivos/:id ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const archivo = await verificarOwnerArchivo(req.params.id, req.user.id)
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado o acceso denegado' })
    const ruta = join(UPLOADS_DIR, archivo.nombre_archivo)
    if (fs.existsSync(ruta)) fs.unlinkSync(ruta)
    await archivo.destroy()
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

// ─── POST /api/archivos/consulta/:consultaId/texto ───────────────
router.post('/consulta/:consultaId/texto', async (req, res) => {
  try {
    const consulta = await verificarOwnerConsulta(req.params.consultaId, req.user.id)
    if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada o acceso denegado' })
    const { titulo, categoria, contenido } = req.body
    if (!titulo || !contenido) return res.status(400).json({ error: 'titulo y contenido son requeridos' })
    const a = await Archivo.create({
      consulta_id:     req.params.consultaId,
      nombre_original: `${titulo}.txt`,
      nombre_archivo:  `${uuidv4()}.txt`,
      tipo_mime:       'text/plain',
      tamano:          Buffer.byteLength(contenido, 'utf8'),
      categoria:       categoria || 'otro',
      descripcion:     titulo,
      contenido,
    })
    res.status(201).json(a)
  } catch (err) { res.status(400).json({ error: errMsg(err) }) }
})

// ─── GET /api/archivos/ver/:filename ─────────────────────────────
// Requiere autenticación (router.use(authMiddleware) arriba)
router.get('/ver/:filename', async (req, res) => {
  try {
    // path.basename previene path traversal (ej: ../../etc/passwd)
    const filename = path.basename(req.params.filename)

    // Verificar que el archivo existe en DB y pertenece al usuario
    const archivo = await Archivo.findOne({
      where: { nombre_archivo: filename },
      include: [{
        model: Consulta,
        as: 'consulta',
        include: [{ model: Paciente, as: 'paciente', attributes: ['doctor_id'] }],
      }],
    })
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado' })
    if (archivo.consulta.paciente.doctor_id !== req.user.id) {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

    if (archivo.contenido != null) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      return res.send(archivo.contenido)
    }
    const ruta = join(UPLOADS_DIR, filename)
    if (!fs.existsSync(ruta)) return res.status(404).json({ error: 'Archivo no encontrado en disco' })
    res.sendFile(ruta)
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

export default router
