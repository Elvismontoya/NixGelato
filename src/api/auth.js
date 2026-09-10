import { apiGet } from './client.js'

const BASE = import.meta.env.VITE_API_URL || ''

// Endpoints SIN sesión (check-initial, login, register-admin): no pueden pasar
// por apiFetch, que fuerza logout ante un 401. Se usa un fetch plano que
// devuelve { ok, status, data } para que la página decida qué mostrar.
async function publicRequest(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    return { ok: false, status: 0, data: { message: 'Error conectando con el servidor.' } }
  }
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// ── endpoint autenticado ──────────────────────────────────
export const getPerfil = () => apiGet('/api/auth/me')

// ── endpoints públicos ────────────────────────────────────
export const checkInitial  = () => publicRequest('/api/auth/check-initial')
export const login         = (usuario, password) =>
  publicRequest('/api/auth/login', { method: 'POST', body: { usuario, password } })
export const registerAdmin = (body) =>
  publicRequest('/api/auth/register-admin', { method: 'POST', body })
