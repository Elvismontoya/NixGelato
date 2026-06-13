// ── cliente HTTP centralizado ─────────────────────────────
// Maneja: token, 401 automático, errores de red

const BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('token') || ''
}

function forceLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('rol')
  // Redirigir sin react-router (funciona desde cualquier contexto)
  window.location.replace('/login')
}

export async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...headers,
    },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  let res
  try {
    res = await fetch(`${BASE}${path}`, opts)
  } catch {
    throw new Error('Sin conexión con el servidor. Verifica tu red.')
  }

  // Token expirado o inválido → logout automático
  if (res.status === 401 || res.status === 403) {
    forceLogout()
    throw new Error('Sesión expirada. Inicia sesión nuevamente.')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `Error ${res.status}`)
  }

  return res.json().catch(() => null)
}

// Alias semánticos
export const apiGet    = (path)         => apiFetch(path)
export const apiPost   = (path, body)   => apiFetch(path, { method: 'POST',   body })
export const apiPut    = (path, body)   => apiFetch(path, { method: 'PUT',    body })
export const apiPatch  = (path, body)   => apiFetch(path, { method: 'PATCH',  body })
export const apiDelete = (path)         => apiFetch(path, { method: 'DELETE' })