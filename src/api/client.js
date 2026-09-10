// ── cliente HTTP centralizado ─────────────────────────────
// Maneja: token, 401 automático, errores de red

const BASE = import.meta.env.VITE_API_URL || ''

// Acepta tanto rutas relativas ('/api/...') como URLs absolutas ya
// construidas con VITE_API_URL, evitando duplicar el host.
function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path
  return `${BASE}${path}`
}

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
    res = await fetch(buildUrl(path), opts)
  } catch {
    throw new Error('Sin conexión con el servidor. Verifica tu red.')
  }

  // 401 = sesión expirada/ inválida → logout automático.
  if (res.status === 401) {
    forceLogout()
    throw new Error('Sesión expirada. Inicia sesión nuevamente.')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    // 403 = permisos insuficientes: se informa, NO se cierra sesión.
    const err = new Error(data.message || `Error ${res.status}`)
    err.status = res.status
    err.body = data
    throw err
  }

  return res.json().catch(() => null)
}

// Alias semánticos
export const apiGet    = (path)         => apiFetch(path)
export const apiPost   = (path, body)   => apiFetch(path, { method: 'POST',   body })
export const apiPut    = (path, body)   => apiFetch(path, { method: 'PUT',    body })
export const apiPatch  = (path, body)   => apiFetch(path, { method: 'PATCH',  body })
export const apiDelete = (path)         => apiFetch(path, { method: 'DELETE' })

// Serializa un objeto a query string ('?a=1&b=2'); ignora null/undefined/''.
export function buildQuery(params = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.append(k, v)
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}