import { ApiError } from '../lib/ApiError.js'

// Manejador de errores global. Debe registrarse DESPUÉS de las rutas.
// (Express identifica este middleware como manejador de errores por su aridad
// de 4 argumentos, así que _req y _next deben permanecer aunque no se usen.)
export function errorHandler(err, _req, res, _next) {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'La solicitud es demasiado grande.' })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido en la solicitud.' })
  }
  if (typeof err?.message === 'string' && err.message.startsWith('CORS:')) {
    return res.status(403).json({ message: 'Origen no permitido.' })
  }
  if (err instanceof ApiError) {
    const body = { message: err.message }
    if (err.code) body.code = err.code
    return res.status(err.status).json(body)
  }
  console.error('Unhandled error:', err?.message || err)
  res.status(500).json({ message: 'Error interno del servidor' })
}
