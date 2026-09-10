// Política de contraseñas (regla de negocio pura).
export const PASSWORD_MIN = 8

// Devuelve null si es válida, o un mensaje de error si no.
export function validarPassword(password) {
  const p = String(password ?? '').trim()
  if (p.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`
  }
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
    return 'La contraseña debe incluir letras y números'
  }
  return null
}
