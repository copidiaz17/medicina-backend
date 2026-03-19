import jwt from 'jsonwebtoken'

export function authMiddleware(req, res, next) {
  const header = req.headers['authorization']
  if (!header) return res.status(401).json({ error: 'Token requerido' })
  const token = header.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token inválido' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token expirado o inválido' })
  }
}

export function hasRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado' })
    }
    next()
  }
}
