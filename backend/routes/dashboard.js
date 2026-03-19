import { Router } from 'express'
import { Op } from 'sequelize'
import { authMiddleware } from '../middleware/auth.js'
import { Paciente } from '../models/Paciente.js'
import { Consulta } from '../models/Consulta.js'
import { ConsultaIA } from '../models/ConsultaIA.js'

const router = Router()
router.use(authMiddleware)

router.get('/stats', async (req, res) => {
  try {
    const doctorId = req.user.id

    // Pacientes activos del doctor
    const totalPacientes = await Paciente.count({
      where: { doctor_id: doctorId, activo: true },
    })

    const pacientesRows = await Paciente.findAll({
      where: { doctor_id: doctorId, activo: true },
      attributes: ['id'],
    })
    const ids = pacientesRows.map(p => p.id)

    let consultasHoy = 0
    let consultasConIA = 0
    let totalConsultas = 0
    let ultimasConsultas = []

    if (ids.length > 0) {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const manana = new Date(hoy)
      manana.setDate(manana.getDate() + 1)

      ;[consultasHoy, consultasConIA, totalConsultas, ultimasConsultas] = await Promise.all([
        Consulta.count({
          where: { paciente_id: { [Op.in]: ids }, fecha: { [Op.gte]: hoy, [Op.lt]: manana } },
        }),
        Consulta.count({
          where: { paciente_id: { [Op.in]: ids } },
          include: [{ model: ConsultaIA, as: 'respuestaIA', required: true }],
        }),
        Consulta.count({ where: { paciente_id: { [Op.in]: ids } } }),
        Consulta.findAll({
          where: { paciente_id: { [Op.in]: ids } },
          order: [['fecha', 'DESC']],
          limit: 6,
          include: [
            { model: Paciente, as: 'paciente', attributes: ['nombre', 'apellido'] },
            { model: ConsultaIA, as: 'respuestaIA', attributes: ['id'], required: false },
          ],
        }),
      ])
    }

    res.json({ totalPacientes, consultasHoy, consultasConIA, totalConsultas, ultimasConsultas })
  } catch (err) {
    const IS_PROD = process.env.NODE_ENV === 'production'
    res.status(500).json({ error: IS_PROD ? 'Error interno del servidor' : err.message })
  }
})

export default router
