// Estado y acciones de sesión. Centraliza lo que estaba duplicado como
// `getToken` / `logout` en ~8 archivos.
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export function getToken() {
  try { return localStorage.getItem('token') || '' } catch { return '' }
}
export function getRol() {
  try { return localStorage.getItem('rol') || '' } catch { return '' }
}

export function saveSession(token, rol) {
  localStorage.setItem('token', token)
  localStorage.setItem('rol', rol)
}
export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('rol')
  localStorage.removeItem('nombreEmpleado')
}

export default function useSession() {
  const navigate = useNavigate()
  const token = getToken()
  const rol = getRol()

  const logout = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])

  return {
    token,
    rol,
    isAuthenticated: !!token,
    isAdmin: rol === 'admin',
    isCajero: rol === 'cajero',
    logout,
  }
}
