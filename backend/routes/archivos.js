import { Router } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { authMiddleware } from '../middleware/auth.js'
import { Archivo } from '../models/Archivo.js'
import { AnalisisImagen } from '../models/AnalisisImagen.js'
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

// ─── Multer config (memoryStorage: evita dependencia del filesystem) ──
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
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
      include: [{ model: AnalisisImagen, as: 'analisis', required: false }],
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
      const cat  = categoria || detectarCategoria(mime, file.originalname)
      const ext  = path.extname(file.originalname).toLowerCase()

      let contenido     = null
      let nombre_archivo = `${uuidv4()}${ext}`

      if (mime === 'text/plain' || ext === '.txt') {
        // Texto: guardar en DB, no necesita archivo físico
        contenido = file.buffer.toString('utf8')
      } else {
        // Binario: escribir al disco
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
// Guarda un informe escrito como texto puro en DB (sin archivo físico)
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
  } catch (err) {
    res.status(400).json({ error: errMsg(err) })
  }
})

// ─── POST /api/archivos/:id/analizar ─────────────────────────────
// Analiza una imagen médica con Claude Vision y guarda el resultado
const MIMES_IMAGEN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const PROMPTS_CATEGORIA = {
  radiologia:  'Sos un radiólogo especialista. Analizá esta radiografía y describí en español los hallazgos principales, cualquier anomalía visible, tu impresión diagnóstica y las recomendaciones para el médico tratante.',
  ecografia:   'Sos un ecografista especialista. Analizá esta ecografía y describí en español los hallazgos principales, mediciones relevantes, cualquier hallazgo patológico y tu impresión diagnóstica.',
  resonancia:  'Sos un neuroradiólogo especialista. Analizá esta resonancia magnética y describí en español los hallazgos en los distintos tejidos, cualquier anomalía, tu impresión diagnóstica y recomendaciones.',
  tomografia:  'Sos un radiólogo especialista en TC. Analizá esta tomografía computada y describí en español los hallazgos principales, densidades, estructuras involucradas, tu impresión diagnóstica y recomendaciones.',
}

router.post('/:id/analizar', async (req, res) => {
  try {
    const archivo = await verificarOwnerArchivo(req.params.id, req.user.id)
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado o acceso denegado' })

    if (!MIMES_IMAGEN.includes(archivo.tipo_mime)) {
      return res.status(400).json({ error: 'Solo se pueden analizar imágenes (JPG, PNG, GIF, WEBP)' })
    }

    const ruta = join(UPLOADS_DIR, archivo.nombre_archivo)
    if (!fs.existsSync(ruta)) return res.status(404).json({ error: 'Archivo no encontrado en disco' })

    const base64 = fs.readFileSync(ruta).toString('base64')
    const promptBase = PROMPTS_CATEGORIA[archivo.categoria] ||
      'Sos un médico especialista en diagnóstico por imágenes. Analizá esta imagen médica y describí en español los hallazgos principales y tu impresión diagnóstica.'
    const prompt = promptBase + '\n\nEstructurá la respuesta con las secciones: **Hallazgos**, **Impresión diagnóstica** y **Recomendaciones**. Aclará al final que es orientativo y la decisión clínica final es del médico tratante.'

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: archivo.tipo_mime, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const hallazgos = response.content[0]?.text || ''

    let analisis = await AnalisisImagen.findOne({ where: { archivo_id: archivo.id } })
    if (analisis) {
      await analisis.update({ hallazgos, tokens_entrada: response.usage.input_tokens, tokens_salida: response.usage.output_tokens, modelo: response.model })
    } else {
      analisis = await AnalisisImagen.create({ archivo_id: archivo.id, hallazgos, tokens_entrada: response.usage.input_tokens, tokens_salida: response.usage.output_tokens, modelo: response.model })
    }

    res.json(analisis)
  } catch (err) {
    console.error('[analizar-imagen]', err)
    res.status(500).json({ error: errMsg(err) })
  }
})

// ─── GET /api/archivos/:id/analisis ──────────────────────────────
router.get('/:id/analisis', async (req, res) => {
  try {
    const archivo = await verificarOwnerArchivo(req.params.id, req.user.id)
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado o acceso denegado' })
    const analisis = await AnalisisImagen.findOne({ where: { archivo_id: req.params.id } })
    if (!analisis) return res.status(404).json({ error: 'Sin análisis' })
    res.json(analisis)
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
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

    // Texto guardado en DB (filesystem efímero en Render)
    if (archivo.contenido !== null && archivo.contenido !== undefined) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      return res.send(archivo.contenido)
    }

    const ruta = join(UPLOADS_DIR, filename)
    if (!fs.existsSync(ruta)) return res.status(404).json({ error: 'Archivo no encontrado en disco' })
    res.sendFile(ruta)
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

export default router
