import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { Consulta } from '../models/Consulta.js'
import { Paciente } from '../models/Paciente.js'
import { ConsultaIA } from '../models/ConsultaIA.js'

const router = Router()
router.use(authMiddleware)

const IS_PROD = process.env.NODE_ENV === 'production'
function errMsg(err, msg = 'Error interno del servidor') {
  return IS_PROD ? msg : err.message
}

// Verifica que la consulta pertenece al doctor autenticado
async function verificarPropietario(consultaId, doctorId) {
  const c = await Consulta.findByPk(consultaId, {
    include: [{ model: Paciente, as: 'paciente', attributes: ['doctor_id'] }]
  })
  if (!c) return null
  if (c.paciente.doctor_id !== doctorId) return null
  return c
}

// Listar consultas de un paciente
router.get('/paciente/:pacienteId', async (req, res) => {
  try {
    const scope = req.user.rol === 'admin' ? {} : { doctor_id: req.user.rol === 'secretaria' ? req.user.medico_id : req.user.id }
    const p = await Paciente.findOne({ where: { id: req.params.pacienteId, ...scope } })
    if (!p) return res.status(404).json({ error: 'Paciente no encontrado' })

    const consultas = await Consulta.findAll({
      where: { paciente_id: req.params.pacienteId },
      order: [['fecha', 'DESC']],
      include: [{ model: ConsultaIA, as: 'respuestaIA', required: false }],
    })
    res.json(consultas)
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

// Detalle de consulta
router.get('/:id', async (req, res) => {
  try {
    const c = await Consulta.findByPk(req.params.id, {
      include: [
        { model: Paciente, as: 'paciente' },
        { model: ConsultaIA, as: 'respuestaIA', required: false },
      ]
    })
    if (!c) return res.status(404).json({ error: 'No encontrada' })
    if (c.paciente.doctor_id !== req.user.id) return res.status(403).json({ error: 'Acceso denegado' })
    res.json(c)
  } catch (err) { res.status(500).json({ error: errMsg(err) }) }
})

// Crear consulta
router.post('/', async (req, res) => {
  try {
    const p = await Paciente.findOne({ where: { id: req.body.paciente_id, doctor_id: req.user.id } })
    if (!p) return res.status(403).json({ error: 'Acceso denegado' })
    const c = await Consulta.create(req.body)
    res.status(201).json(c)
  } catch (err) { res.status(400).json({ error: errMsg(err, 'Error al crear consulta') }) }
})

// Editar consulta
router.put('/:id', async (req, res) => {
  try {
    const c = await verificarPropietario(req.params.id, req.user.id)
    if (!c) return res.status(404).json({ error: 'No encontrada o acceso denegado' })
    await c.update(req.body)
    res.json(c)
  } catch (err) { res.status(400).json({ error: errMsg(err, 'Error al actualizar consulta') }) }
})

export default router
