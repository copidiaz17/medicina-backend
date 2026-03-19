import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Usuario } from '../models/Usuario.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
const IS_PROD = process.env.NODE_ENV === 'production'

// Mínimo 8 caracteres, al menos una letra y un número
function validarPassword(password) {
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[a-zA-Z]/.test(password))       return 'La contraseña debe contener al menos una letra'
  if (!/[0-9]/.test(password))           return 'La contraseña debe contener al menos un número'
  return null
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await Usuario.findOne({ where: { username, activo: true } })
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, username: user.username, rol: user.rol, medico_id: user.medico_id ?? null, demo: user.demo ?? false },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    )
    res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol, medico_id: user.medico_id ?? null, demo: user.demo ?? false } })
  } catch (err) {
    res.status(500).json({ error: IS_PROD ? 'Error de autenticación' : err.message })
  }
})

// Setup inicial — solo funciona si no existe ningún admin en la DB
router.post('/crear-admin', async (req, res) => {
  try {
    const existe = await Usuario.findOne({ where: { rol: 'admin' } })
    if (existe) return res.status(403).json({ error: 'Ya existe un administrador. Usá el panel de usuarios.' })
    const { nombre, username, password } = req.body
    if (!nombre || !username || !password) return res.status(400).json({ error: 'Faltan campos requeridos' })
    const errPass = validarPassword(password)
    if (errPass) return res.status(400).json({ error: errPass })
    const hash = await bcrypt.hash(password, 10)
    const user = await Usuario.create({ nombre, username, password: hash, rol: 'admin' })
    res.status(201).json({ ok: true, user: { id: user.id, nombre: user.nombre, username: user.username } })
  } catch (err) {
    res.status(500).json({ error: IS_PROD ? 'Error al crear administrador' : err.message })
  }
})

// Cambiar contraseña propia — cualquier usuario autenticado
router.post('/cambiar-password', authMiddleware, async (req, res) => {
  const { password_actual, password_nuevo } = req.body
  if (!password_actual || !password_nuevo) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }
  const errPass = validarPassword(password_nuevo)
  if (errPass) return res.status(400).json({ error: errPass })

  try {
    const user = await Usuario.findByPk(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    const ok = await bcrypt.compare(password_actual, user.password)
    if (!ok) return res.status(401).json({ error: 'La contraseña actual es incorrecta' })
    await user.update({ password: await bcrypt.hash(password_nuevo, 10) })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: IS_PROD ? 'Error al cambiar contraseña' : err.message })
  }
})

// Refresh token — extiende la sesión sin re-login
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const user = await Usuario.findByPk(req.user.id)
    if (!user || !user.activo) return res.status(401).json({ error: 'Usuario inactivo' })
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, username: user.username, rol: user.rol, medico_id: user.medico_id ?? null, demo: user.demo ?? false },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    )
    res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol, medico_id: user.medico_id ?? null, demo: user.demo ?? false } })
  } catch (err) {
    res.status(500).json({ error: 'Error al renovar sesión' })
  }
})

export default router
