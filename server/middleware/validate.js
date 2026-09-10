import { ApiError } from '../lib/ApiError.js'

// Valida (y normaliza) una parte de la petición contra un schema zod.
//   validate(schema)            → valida req.body
//   validate(schema, 'query')   → valida req.query
// En caso de fallo lanza ApiError 400 con el primer mensaje de error.
// Los schemas cubren SÓLO la forma (tipos, estructura); las reglas de
// negocio y sus mensajes siguen en los servicios.
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {})
    if (!result.success) {
      const issue = result.error.issues[0]
      const campo = issue?.path?.join('.')
      const msg = campo ? `${campo}: ${issue.message}` : issue?.message || 'Solicitud inválida'
      return next(ApiError.badRequest(msg))
    }
    // req.query es un getter en Express 5; se asigna sólo cuando es escribible.
    try { req[source] = result.data } catch { /* noop */ }
    next()
  }
}
