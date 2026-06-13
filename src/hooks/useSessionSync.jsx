// Sincroniza la sesión entre pestañas usando el evento 'storage'.
// Si el token se borra/cambia en otra pestaña (logout, cambio de usuario),
// esta pestaña reacciona inmediatamente.

import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const PUBLIC_PATHS = ['/', '/login']

export default function useSessionSync() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function onStorage(e) {
      // Solo nos interesan cambios en 'token' o 'rol'
      if (e.key !== 'token' && e.key !== 'rol' && e.key !== null) return

      const tokenActual = localStorage.getItem('token')
      const esRutaPublica = PUBLIC_PATHS.includes(location.pathname)

      if (!tokenActual) {
        // Se hizo logout en otra pestaña
        if (!esRutaPublica) {
          navigate('/login', { replace: true })
        }
      } else if (e.key === 'rol' || e.key === 'token') {
        // Se inició sesión con otro usuario en otra pestaña
        // Recargamos para reflejar el nuevo rol/permisos
        if (!esRutaPublica) {
          window.location.reload()
        }
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [navigate, location.pathname])
}