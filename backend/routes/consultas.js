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
    const scope = req.user.rol === 'admin' ? {} : { doctor_id: req.user.rol === 'secretaria' ? req.user.medico_id : req.user.id }
    const p = await Paciente.findOne({ where: { id: req.body.paciente_id, ...scope } })
    if (!p) return res.status(403).json({ error: 'Acceso denegado' })
    // Convertir strings vacíos a null en campos numéricos
    const campos_num = ['frecuencia_cardiaca', 'frecuencia_respiratoria', 'temperatura', 'saturacion_o2', 'peso_kg']
    const datos = { ...req.body }
    for (const c of campos_num) if (datos[c] === '' || datos[c] === undefined) datos[c] = null
    const consulta = await Consulta.create(datos)
    res.status(201).json(consulta)
  } catch (err) {
    console.error('[ERROR consulta]', err.message)
    res.status(400).json({ error: err.message || 'Error al crear consulta' })
  }
})

// Editar consulta
router.put('/:id', async (req, res) => {
  try {
    const doctorId = req.user.rol === 'admin' ? null : req.user.id
    const c = doctorId === null
      ? await Consulta.findByPk(req.params.id, { include: [{ model: Paciente, as: 'paciente', attributes: ['doctor_id'] }] })
      : await verificarPropietario(req.params.id, doctorId)
    if (!c) return res.status(404).json({ error: 'No encontrada o acceso denegado' })
    const campos_num = ['frecuencia_cardiaca', 'frecuencia_respiratoria', 'temperatura', 'saturacion_o2', 'peso_kg']
    const datos = { ...req.body }
    for (const campo of campos_num) if (datos[campo] === '' || datos[campo] === undefined) datos[campo] = null
    await c.update(datos)
    res.json(c)
  } catch (err) {
    console.error('[ERROR update consulta]', err.message)
    res.status(400).json({ error: err.message || 'Error al actualizar consulta' })
  }
})

export default router
