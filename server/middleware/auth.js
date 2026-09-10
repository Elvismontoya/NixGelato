import jwt from 'jsonwebtoken'

// Claims de emisor/audiencia: acotan dónde es válido el token.
export const JWT_ISSUER   = 'nixgelato-api'
export const JWT_AUDIENCE = 'nixgelato-web'

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (!header || typeof header !== 'string') return null
  const parts = header.trim().split(/\s+/)
  if (parts.length !== 2) return null
  const [scheme, token] = parts
  if (!/^Bearer$/i.test(scheme)) return null
  return token || null
}

export function verifyToken(req, res, next) {
  const token = getBearerToken(req)
  // 401 = problema de autenticación (token ausente/expirado/inválido).
  // Se reserva 403 para permisos insuficientes (ver requireAdmin/requireRoles),
  // para que el cliente distinga "vuelve a iniciar sesión" de "no tienes acceso".
  if (!token) return res.status(401).json({ message: 'Token requerido' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      clockTolerance: 5,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    if (payload?.rol) payload.rol = String(payload.rol).toLowerCase()
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Token expirado o inválido' })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.rol || req.user.rol !== 'admin') {
    return res.status(403).json({ message: 'Solo administrador puede realizar esta acción' })
  }
  next()
}

export function requireRoles(...roles) {
  const set = new Set(roles.map((r) => String(r).toLowerCase()))
  return (req, res, next) => {
    const userRole = req.user?.rol
    if (!userRole || !set.has(userRole)) {
      return res.status(403).json({ message: 'Permisos insuficientes' })
    }
    next()
  }
}
