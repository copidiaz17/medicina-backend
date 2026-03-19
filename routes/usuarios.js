import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { authMiddleware, hasRole } from '../middleware/auth.js'
import { Usuario } from '../models/Usuario.js'

const router = Router()
router.use(authMiddleware)

const IS_PROD = process.env.NODE_ENV === 'production'

// Mínimo 8 caracteres, al menos una letra y un número
function validarPassword(password) {
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[a-zA-Z]/.test(password))       return 'La contraseña debe contener al menos una letra'
  if (!/[0-9]/.test(password))           return 'La contraseña debe contener al menos un número'
  return null
}

router.get('/', hasRole(['admin']), async (req, res) => {
  try {
    const users = await Usuario.findAll({ attributes: { exclude: ['password'] } })
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: IS_PROD ? 'Error interno' : err.message })
  }
})

// Lista de médicos activos — accesible para secretaria y admin (para selector de agenda)
router.get('/medicos', async (req, res) => {
  try {
    const medicos = await Usuario.findAll({
      where: { rol: 'medico', activo: true },
      attributes: ['id', 'nombre'],
      order: [['nombre', 'ASC']],
    })
    res.json(medicos)
  } catch (err) {
    res.status(500).json({ error: IS_PROD ? 'Error interno' : err.message })
  }
})

router.post('/', hasRole(['admin']), async (req, res) => {
  try {
    const { nombre, username, password, rol, medico_id } = req.body
    if (!nombre || !username || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }
    if (rol === 'secretaria' && !medico_id) {
      return res.status(400).json({ error: 'La secretaria debe tener un médico asignado' })
    }
    const errPass = validarPassword(password)
    if (errPass) return res.status(400).json({ error: errPass })

    const hash = await bcrypt.hash(password, 10)
    const medicoIdFinal = rol === 'secretaria' ? medico_id : null
    const u = await Usuario.create({ nombre, username, password: hash, rol, medico_id: medicoIdFinal })
    res.status(201).json({ id: u.id, nombre: u.nombre, rol: u.rol, medico_id: u.medico_id })
  } catch (err) {
    res.status(400).json({ error: IS_PROD ? 'Error al crear usuario' : err.message })
  }
})

router.put('/:id', hasRole(['admin']), async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.id)
    if (!u) return res.status(404).json({ error: 'No encontrado' })
    const updates = { ...req.body }
    if (updates.password) {
      const errPass = validarPassword(updates.password)
      if (errPass) return res.status(400).json({ error: errPass })
      updates.password = await bcrypt.hash(updates.password, 10)
    }
    // Validar medico_id si se cambia a secretaria
    if (updates.rol === 'secretaria' && !updates.medico_id && !u.medico_id) {
      return res.status(400).json({ error: 'La secretaria debe tener un médico asignado' })
    }
    // Si cambia de secretaria a otro rol, limpiar medico_id
    if (updates.rol && updates.rol !== 'secretaria') updates.medico_id = null
    await u.update(updates)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: IS_PROD ? 'Error al actualizar usuario' : err.message })
  }
})

export default router
