import { Router } from 'express'
import { Op } from 'sequelize'
import { authMiddleware } from '../middleware/auth.js'
import { Turno } from '../models/Turno.js'
import { Paciente } from '../models/Paciente.js'
import { sendWhatsApp } from '../utils/whatsapp.js'

const router = Router()
router.use(authMiddleware)

const IS_PROD = process.env.NODE_ENV === 'production'

// admin ve todos; secretaria ve solo los de su médico asignado; médico solo los suyos
function scopeDoctor(user) {
  if (user.rol === 'admin') return {}
  if (user.rol === 'secretaria') return { doctor_id: user.medico_id }
  return { doctor_id: user.id }
}

// Verifica solapamiento: mismo médico, misma fecha, misma hora, distinto id
async function hayConflicto(doctor_id, fecha, hora, excludeId = null) {
  const where = { doctor_id, fecha, hora, estado: { [Op.notIn]: ['cancelado'] } }
  if (excludeId) where.id = { [Op.ne]: excludeId }
  const existe = await Turno.findOne({ where })
  return !!existe
}

// GET /api/turnos?fecha=&mes=&estado=&doctor_id=
router.get('/', async (req, res) => {
  try {
    const { fecha, mes, estado, doctor_id } = req.query
    const where = { ...scopeDoctor(req.user) }

    // Solo admin puede filtrar por médico específico (secretaria ya está bloqueada a su médico)
    if (doctor_id && req.user.rol === 'admin') {
      where.doctor_id = doctor_id
    }

    if (fecha) {
      where.fecha = fecha
    } else if (mes) {
      const [y, m] = mes.split('-').map(Number)
      const desde = `${y}-${String(m).padStart(2,'0')}-01`
      const hasta = new Date(y, m, 0).toISOString().split('T')[0]
      where.fecha = { [Op.between]: [desde, hasta] }
    }

    if (estado) where.estado = estado

    const turnos = await Turno.findAll({
      where,
      include: [{ model: Paciente, as: 'paciente', attributes: ['id','nombre','apellido','telefono'] }],
      order: [['fecha','ASC'], ['hora','ASC']],
    })
    res.json(turnos)
  } catch (err) { res.status(500).json({ error: IS_PROD ? 'Error interno' : err.message }) }
})

// GET /api/turnos/hoy
router.get('/hoy', async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0]
    const turnos = await Turno.findAll({
      where: { ...scopeDoctor(req.user), fecha: hoy },
      include: [{ model: Paciente, as: 'paciente', attributes: ['id','nombre','apellido','telefono'] }],
      order: [['hora','ASC']],
    })
    res.json(turnos)
  } catch (err) { res.status(500).json({ error: IS_PROD ? 'Error interno' : err.message }) }
})

// GET /api/turnos/disponibles?doctor_id=&fecha=
// Devuelve slots de 30 min entre 08:00 y 20:00 marcando cuáles están ocupados
router.get('/disponibles', async (req, res) => {
  try {
    const { doctor_id, fecha } = req.query
    if (!doctor_id || !fecha) return res.status(400).json({ error: 'doctor_id y fecha son requeridos' })

    const turnos = await Turno.findAll({
      where: { doctor_id, fecha, estado: { [Op.notIn]: ['cancelado'] } },
      include: [{ model: Paciente, as: 'paciente', attributes: ['nombre','apellido'] }],
      order: [['hora','ASC']],
    })

    const ocupados = new Map(turnos.map(t => [t.hora, t]))

    // Generar slots de 30 min de 08:00 a 20:00
    const slots = []
    for (let h = 8; h < 20; h++) {
      for (const min of ['00', '30']) {
        const hora = `${String(h).padStart(2,'0')}:${min}`
        const turno = ocupados.get(hora)
        slots.push({
          hora,
          disponible: !turno,
          turno: turno ? {
            id:      turno.id,
            estado:  turno.estado,
            motivo:  turno.motivo,
            paciente: turno.paciente,
          } : null,
        })
      }
    }

    res.json({ fecha, doctor_id, slots })
  } catch (err) { res.status(500).json({ error: IS_PROD ? 'Error interno' : err.message }) }
})

// POST /api/turnos
router.post('/', async (req, res) => {
  try {
    const { paciente_id, fecha, hora, motivo, notas, doctor_id: doctorBody, notificar_whatsapp } = req.body
    if (!paciente_id || !fecha || !hora) return res.status(400).json({ error: 'Faltan campos requeridos' })

    // Admin puede especificar cualquier médico; secretaria usa su médico asignado; médico usa su propio id
    let doctorId
    if (req.user.rol === 'admin' && doctorBody) doctorId = Number(doctorBody)
    else if (req.user.rol === 'secretaria') doctorId = req.user.medico_id
    else doctorId = req.user.id

    // Verificar que el paciente pertenece al médico correspondiente
    const whereP = req.user.rol === 'admin'
      ? { id: paciente_id }
      : { id: paciente_id, doctor_id: doctorId }
    const pac = await Paciente.findOne({ where: whereP })
    if (!pac) return res.status(404).json({ error: 'Paciente no encontrado' })

    // Verificar solapamiento
    if (await hayConflicto(doctorId, fecha, hora)) {
      return res.status(409).json({ error: `Ya existe un turno para ese médico el ${fecha} a las ${hora}` })
    }

    const turno = await Turno.create({ paciente_id, doctor_id: doctorId, fecha, hora, motivo, notas })

    // Notificación WhatsApp opcional
    if (notificar_whatsapp && pac.telefono) {
      const fechaFmt = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })
      await sendWhatsApp(
        pac.telefono,
        `Hola ${pac.nombre}, te confirmamos tu turno para el ${fechaFmt} a las ${hora}${motivo ? ` — ${motivo}` : ''}. Ante cualquier cambio comunicate con el consultorio.`
      ).catch(() => {}) // no fallar si WhatsApp falla
    }

    const result = await Turno.findByPk(turno.id, {
      include: [{ model: Paciente, as: 'paciente', attributes: ['id','nombre','apellido','telefono'] }],
    })
    res.status(201).json(result)
  } catch (err) { res.status(500).json({ error: IS_PROD ? 'Error al crear turno' : err.message }) }
})

// PUT /api/turnos/:id
router.put('/:id', async (req, res) => {
  try {
    const turno = await Turno.findOne({ where: { id: req.params.id, ...scopeDoctor(req.user) } })
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' })

    // Verificar solapamiento si cambia fecha u hora
    const nuevaFecha = req.body.fecha || turno.fecha
    const nuevaHora  = req.body.hora  || turno.hora
    if ((req.body.fecha || req.body.hora) && req.body.estado !== 'cancelado') {
      if (await hayConflicto(turno.doctor_id, nuevaFecha, nuevaHora, turno.id)) {
        return res.status(409).json({ error: `Ya existe un turno el ${nuevaFecha} a las ${nuevaHora}` })
      }
    }

    await turno.update(req.body)
    res.json(turno)
  } catch (err) { res.status(500).json({ error: IS_PROD ? 'Error al actualizar turno' : err.message }) }
})

// DELETE /api/turnos/:id
router.delete('/:id', async (req, res) => {
  try {
    const turno = await Turno.findOne({ where: { id: req.params.id, ...scopeDoctor(req.user) } })
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' })
    await turno.destroy()
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: IS_PROD ? 'Error interno' : err.message }) }
})

export default router
