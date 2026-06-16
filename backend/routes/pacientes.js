import { Router } from 'express'
import { Op } from 'sequelize'
import { authMiddleware } from '../middleware/auth.js'
import { Paciente } from '../models/Paciente.js'
import { Antecedente } from '../models/Antecedente.js'
import { Medicacion } from '../models/Medicacion.js'
import { Consulta } from '../models/Consulta.js'

const router = Router()
router.use(authMiddleware)

const IS_PROD = process.env.NODE_ENV === 'production'
function errMsg(err, msg = 'Error interno del servidor') {
  return IS_PROD ? msg : err.message
}

// Cada médico solo accede a sus propios pacientes
// Admin ve todos; secretaria ve solo los de su médico asignado
function scopeDoctor(req) {
  if (req.user.rol === 'admin') return {}
  if (req.user.rol === 'secretaria') return { doctor_id: req.user.medico_id }
  return { doctor_id: req.user.id }
}

// Listar pacientes (con paginación opcional)
router.get('/', async (req, res) => {
  try {
    const { q, page, limit: lim } = req.query
    const where = { activo: true, ...scopeDoctor(req) }
    if (q) where[Op.or] = [
      { nombre:   { [Op.like]: `%${q}%` } },
      { apellido: { [Op.like]: `%${q}%` } },
      { dni:      { [Op.like]: `%${q}%` } },
    ]

    if (!page) {
      const pacientes = await Paciente.findAll({ where, order: [['apellido','ASC'],['nombre','ASC']] })
      return res.json(pacientes)
    }

    const pageNum  = Math.max(1, parseInt(page) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(lim) || 20))
    const offset   = (pageNum - 1) * pageSize

    const { count, rows } = await Paciente.findAndCountAll({
      where,
      order:  [['apellido','ASC'],['nombre','ASC']],
      limit:  pageSize,
      offset,
    })

    res.json({
      data:       rows,
      total:      count,
      page:       pageNum,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    })
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

// Detalle completo
router.get('/:id', async (req, res) => {
  try {
    const p = await Paciente.findOne({
      where: { id: req.params.id, ...scopeDoctor(req) },
      include: [
        { model: Antecedente, as: 'antecedente' },
        { model: Medicacion,  as: 'medicaciones', where: { activo: true }, required: false },
        { model: Consulta,    as: 'consultas', order: [['fecha','DESC']], limit: 20, required: false },
      ]
    })
    if (!p) return res.status(404).json({ error: 'Paciente no encontrado' })
    res.json(p)
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

// Campos nullable en la base (fecha/número): un '' del formulario debe guardarse como null
const CAMPOS_NULLABLE = ['fecha_nacimiento', 'peso_kg', 'talla_cm']
function sanitizarPaciente(body) {
  const out = { ...body }
  for (const c of CAMPOS_NULLABLE) if (out[c] === '' || out[c] === undefined) out[c] = null
  return out
}

// Crear paciente — auto-asigna doctor_id (secretaria usa su médico asignado)
router.post('/', async (req, res) => {
  try {
    const doctorId = req.user.rol === 'secretaria' ? req.user.medico_id : req.user.id
    const p = await Paciente.create({ ...sanitizarPaciente(req.body), doctor_id: doctorId })
    res.status(201).json(p)
  } catch (err) { res.status(400).json({ error: errMsg(err, 'Error al crear paciente') }) }
})

// Editar paciente — verifica que pertenece al doctor
router.put('/:id', async (req, res) => {
  try {
    const p = await Paciente.findOne({ where: { id: req.params.id, ...scopeDoctor(req) } })
    if (!p) return res.status(404).json({ error: 'No encontrado' })
    await p.update(sanitizarPaciente(req.body))
    res.json(p)
  } catch (err) { res.status(400).json({ error: errMsg(err, 'Error al actualizar paciente') }) }
})

// Eliminar paciente (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const p = await Paciente.findOne({ where: { id: req.params.id, ...scopeDoctor(req) } })
    if (!p) return res.status(404).json({ error: 'No encontrado' })
    await p.update({ activo: false })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

// Guardar/actualizar antecedentes
router.put('/:id/antecedentes', async (req, res) => {
  try {
    const p = await Paciente.findOne({ where: { id: req.params.id, ...scopeDoctor(req) } })
    if (!p) return res.status(404).json({ error: 'Paciente no encontrado' })

    // Solo campos válidos del modelo
    const campos = ['antecedentes_familiares', 'patologias_previas', 'alergias', 'cirugias_previas', 'tabaco', 'alcohol', 'actividad_fisica', 'otros_habitos']
    const datos = {}
    for (const c of campos) if (req.body[c] !== undefined) datos[c] = req.body[c]

    const existing = await Antecedente.findOne({ where: { paciente_id: req.params.id } })
    let ant
    if (existing) {
      await existing.update(datos)
      ant = existing
    } else {
      ant = await Antecedente.create({ ...datos, paciente_id: Number(req.params.id) })
    }
    res.json(ant)
  } catch (err) {
    console.error('[ERROR antecedentes]', err.message, err.stack)
    res.status(400).json({ error: err.message || 'Error al guardar antecedentes' })
  }
})

// ── Medicaciones ────────────────────────────────────────────────────────────

router.post('/:id/medicaciones', async (req, res) => {
  try {
    const p = await Paciente.findOne({ where: { id: req.params.id, ...scopeDoctor(req) } })
    if (!p) return res.status(404).json({ error: 'Paciente no encontrado' })
    const m = await Medicacion.create({ ...req.body, paciente_id: req.params.id })
    res.status(201).json(m)
  } catch (err) { res.status(400).json({ error: errMsg(err, 'Error al crear medicación') }) }
})

router.put('/:id/medicaciones/:mid', async (req, res) => {
  try {
    const p = await Paciente.findOne({ where: { id: req.params.id, ...scopeDoctor(req) } })
    if (!p) return res.status(404).json({ error: 'Paciente no encontrado' })
    const m = await Medicacion.findOne({ where: { id: req.params.mid, paciente_id: req.params.id } })
    if (!m) return res.status(404).json({ error: 'No encontrado' })
    await m.update(req.body)
    res.json(m)
  } catch (err) { res.status(400).json({ error: errMsg(err, 'Error al actualizar medicación') }) }
})

router.delete('/:id/medicaciones/:mid', async (req, res) => {
  try {
    const p = await Paciente.findOne({ where: { id: req.params.id, ...scopeDoctor(req) } })
    if (!p) return res.status(404).json({ error: 'Paciente no encontrado' })
    await Medicacion.update({ activo: false }, { where: { id: req.params.mid, paciente_id: req.params.id } })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

export default router
