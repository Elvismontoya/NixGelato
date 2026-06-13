import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar.jsx'
import Footer from '../components/Footer.jsx'

const getToken = () => localStorage.getItem('token') || ''
const money = (n) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })

export default function Caja() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const cajaRequerida = location.state?.cajaRequerida === true

  const [estadoCaja,   setEstadoCaja]   = useState(null)   // apertura del día
  const [historial,    setHistorial]    = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [errorGlobal,  setErrorGlobal]  = useState('')

  // Apertura form
  const [montoApertura, setMontoApertura]   = useState('')
  const [obsApertura,   setObsApertura]     = useState('')
  const [msgApertura,   setMsgApertura]     = useState({ text: '', type: 'muted' })
  const [loadApertura,  setLoadApertura]    = useState(false)

  // Cierre form
  const [montoCierre, setMontoCierre]   = useState('')
  const [obsCierre,   setObsCierre]     = useState('')
  const [msgCierre,   setMsgCierre]     = useState({ text: '', type: 'muted' })
  const [loadCierre,  setLoadCierre]    = useState(false)
  const [resumenCierre, setResumenCierre] = useState(null)
  const [cajasHoy, setCajasHoy] = useState([])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    navigate('/login', { replace: true })
  }

  // ── Cargar estado del día ────────────────────────────────
  async function cargarEstado() {
    try {
      setCargando(true)
      setErrorGlobal('')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/caja/estado`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.status === 401 || res.status === 403) { logout(); return }
      if (!res.ok) throw new Error('Error consultando caja')
      const data = await res.json()
      setEstadoCaja(data.apertura)
    } catch (err) {
      console.error(err)
      setErrorGlobal('Error al cargar el estado de la caja. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  async function cargarHistorial() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/caja/historial?limit=30`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setHistorial(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Historial:', err)
    }
  }

  async function cargarCajasHoy() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/caja/estado-todas`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCajasHoy(Array.isArray(data.cajas) ? data.cajas : [])
      }
    } catch (err) {
      console.error('Cajas de hoy:', err)
    }
  }

  useEffect(() => {
    cargarEstado()
    cargarHistorial()
    cargarCajasHoy()
  }, [])

  // ── Apertura ─────────────────────────────────────────────
  async function registrarApertura(e) {
    e.preventDefault()
    const monto = Number(montoApertura)
    if (isNaN(monto) || monto < 0) {
      setMsgApertura({ text: 'Ingresa un monto válido (puede ser 0)', type: 'danger' })
      return
    }
    setLoadApertura(true)
    setMsgApertura({ text: 'Registrando apertura...', type: 'muted' })
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/caja/apertura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ monto_apertura: monto, observaciones: obsApertura }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsgApertura({ text: data.message || 'Error registrando apertura', type: 'danger' })
        return
      }
      setMsgApertura({ text: '✅ Caja abierta correctamente', type: 'success' })
      setMontoApertura('')
      setObsApertura('')
      await cargarEstado()
      await cargarHistorial()
      await cargarCajasHoy()
    } catch (err) {
      console.error(err)
      setMsgApertura({ text: 'Error al conectar con el servidor', type: 'danger' })
    } finally {
      setLoadApertura(false)
    }
  }

  // ── Cierre ───────────────────────────────────────────────
  async function registrarCierre(e) {
    e.preventDefault()
    const monto = Number(montoCierre)
    if (isNaN(monto) || monto < 0) {
      setMsgCierre({ text: 'Ingresa un monto válido', type: 'danger' })
      return
    }
    if (!estadoCaja?.id_apertura) {
      setMsgCierre({ text: 'No hay apertura activa para cerrar', type: 'danger' })
      return
    }
    setLoadCierre(true)
    setMsgCierre({ text: 'Procesando cierre...', type: 'muted' })
    setResumenCierre(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/caja/cierre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          id_apertura: estadoCaja.id_apertura,
          monto_cierre: monto,
          observaciones: obsCierre,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsgCierre({ text: data.message || 'Error registrando cierre', type: 'danger' })
        return
      }
      setMsgCierre({ text: '✅ Caja cerrada correctamente', type: 'success' })
      setResumenCierre(data.resumen)
      setMontoCierre('')
      setObsCierre('')
      await cargarEstado()
      await cargarHistorial()
      await cargarCajasHoy()
    } catch (err) {
      console.error(err)
      setMsgCierre({ text: 'Error al conectar con el servidor', type: 'danger' })
    } finally {
      setLoadCierre(false)
    }
  }

  // ── Helpers UI ────────────────────────────────────────────
  const aperturaAbierta = estadoCaja?.estado === 'abierta'
  const aperturaCerrada = estadoCaja?.estado === 'cerrada'
  const sinApertura     = !estadoCaja

  const estadoBadge = useMemo(() => {
    if (!estadoCaja) return null
    return estadoCaja.estado === 'abierta'
      ? <span className="badge bg-success fs-6">🟢 Abierta</span>
      : <span className="badge bg-secondary fs-6">🔴 Cerrada</span>
  }, [estadoCaja])

  if (cargando) {
    return (
      <>
        <AdminNavbar onLogout={logout} />
        <main className="container my-4">
          <div className="text-center py-5">
            <div className="spinner-border text-brand" role="status" />
            <p className="mt-3">Consultando estado de caja...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminNavbar onLogout={logout} />

      <main className="container my-4">
        {/* Hero */}
        <section className="hero mb-4 text-center fade-in">
          <h1 className="display-6 fw-bold mb-2">💰 Apertura y Cierre de Caja</h1>
          <p className="lead mb-0">Registra el dinero inicial del día y cierra la caja al terminar.</p>
        </section>

        {/* Aviso obligatorio */}
        {cajaRequerida && sinApertura && (
          <div className="alert alert-warning d-flex align-items-center gap-3 mb-4" role="alert">
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong>Debes abrir la caja antes de continuar.</strong>
              <div className="small mt-1">Registra el dinero disponible en caja para comenzar a operar el día de hoy.</div>
            </div>
          </div>
        )}

        {cajaRequerida && aperturaAbierta && (
          <div className="alert alert-success d-flex align-items-center justify-content-between gap-3 mb-4">
            <div className="d-flex align-items-center gap-3">
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <div>
                <strong>Caja abierta. Ya puedes operar.</strong>
                <div className="small mt-1">El sistema está listo para recibir ventas.</div>
              </div>
            </div>
            <button className="btn btn-success btn-sm" onClick={() => navigate('/admin', { replace: true })}>
              Ir al panel →
            </button>
          </div>
        )}

        {/* Estado del día */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Estado de caja — hoy</h5>
              <div className="d-flex gap-2 align-items-center">
                {estadoBadge ?? <span className="badge bg-warning text-dark fs-6">⚪ Sin apertura</span>}
                <button className="btn btn-sm btn-outline-secondary" onClick={() => { cargarEstado(); cargarHistorial(); cargarCajasHoy() }}>
                  🔄
                </button>
              </div>
            </div>

            {estadoCaja ? (
              <div className="row g-3">
                {[
                  { label: 'Monto apertura',          val: money(estadoCaja.monto_apertura) },
                  { label: 'Ventas efectivo del día',  val: estadoCaja.total_ventas_efectivo != null ? money(estadoCaja.total_ventas_efectivo) : '—' },
                  { label: 'Monto cierre',             val: estadoCaja.monto_cierre != null ? money(estadoCaja.monto_cierre) : '—' },
                  { label: 'Diferencia',               val: estadoCaja.diferencia != null ? money(estadoCaja.diferencia) : '—',
                    color: estadoCaja.diferencia != null ? (estadoCaja.diferencia > 0 ? 'text-success' : estadoCaja.diferencia < 0 ? 'text-danger' : 'text-muted') : '' },
                ].map((s) => (
                  <div className="col-6 col-md-3" key={s.label}>
                    <div className="card card-soft text-center p-3">
                      <div className="text-muted small">{s.label}</div>
                      <div className={`h5 fw-bold mt-1 ${s.color || 'text-gradient'}`}>{s.val}</div>
                    </div>
                  </div>
                ))}
                {estadoCaja.empleados && (
                  <div className="col-12">
                    <small className="text-muted">
                      Abierta por: <strong>{estadoCaja.empleados.nombres} {estadoCaja.empleados.apellidos}</strong>
                      {' · '}
                      {new Date(estadoCaja.fecha_hora_apertura).toLocaleString('es-CO')}
                      {estadoCaja.observaciones_apertura && ` · "${estadoCaja.observaciones_apertura}"`}
                    </small>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted mb-0">No hay apertura de caja registrada para hoy.</p>
            )}
          </div>
        </div>

        {/* Cajas abiertas hoy (multi-caja) */}
        {cajasHoy.length > 0 && (
          <div className="card card-soft mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">👥 Cajas del día (todos los cajeros)</h6>
                <span className="badge bg-info">{cajasHoy.length}</span>
              </div>
              <div className="row g-2">
                {cajasHoy.map((c) => (
                  <div className="col-md-4 col-sm-6" key={c.id_apertura}>
                    <div className="card card-soft p-3 h-100">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-semibold small">
                          {c.empleados ? `${c.empleados.nombres} ${c.empleados.apellidos}` : `Empleado #${c.id_empleado}`}
                        </span>
                        {c.estado === 'abierta'
                          ? <span className="badge bg-success">🟢 Abierta</span>
                          : <span className="badge bg-secondary">🔴 Cerrada</span>}
                      </div>
                      <div className="small text-muted">Apertura: {money(c.monto_apertura)}</div>
                      {c.monto_cierre != null && (
                        <>
                          <div className="small text-muted">Cierre: {money(c.monto_cierre)}</div>
                          <div className={`small fw-semibold ${Number(c.diferencia) > 0 ? "text-success" : Number(c.diferencia) < 0 ? "text-danger" : "text-muted"}`}>
                            Diferencia: {money(c.diferencia)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Resumen de cierre (se muestra tras cerrar) */}
        {resumenCierre && (
          <div className={`alert ${resumenCierre.diferencia === 0 ? 'alert-success' : resumenCierre.diferencia > 0 ? 'alert-info' : 'alert-warning'} mb-4`}>
            <h6 className="fw-bold mb-3">📋 Resumen del cierre</h6>
            <div className="row g-2 text-center">
              {[
                { label: 'Efectivo inicial',    val: money(resumenCierre.monto_apertura) },
                { label: 'Ventas en efectivo',  val: money(resumenCierre.total_ventas_efectivo) },
                { label: 'Total esperado',      val: money(resumenCierre.monto_esperado) },
                { label: 'Efectivo contado',    val: money(resumenCierre.monto_cierre) },
              ].map((s) => (
                <div className="col-6 col-md-3" key={s.label}>
                  <div className="small text-muted">{s.label}</div>
                  <div className="fw-bold">{s.val}</div>
                </div>
              ))}
            </div>
            <hr className="my-2" />
            <div className="text-center">
              <strong>Diferencia: {money(resumenCierre.diferencia)}</strong>
              {' '}
              {resumenCierre.estado === 'exacto'    && <span className="badge bg-success">✅ Exacto</span>}
              {resumenCierre.estado === 'sobrante'  && <span className="badge bg-info">📈 Sobrante</span>}
              {resumenCierre.estado === 'faltante'  && <span className="badge bg-warning text-dark">⚠️ Faltante</span>}
            </div>
          </div>
        )}

        <div className="row g-4">
          {/* Apertura */}
          <div className="col-md-6">
            <div className="card card-soft h-100">
              <div className="card-body">
                <h5 className="mb-1">🌅 Apertura de caja</h5>
                <p className="text-muted small mb-3">Registra cuánto dinero hay físicamente en caja al iniciar el día.</p>

                {!sinApertura ? (
                  <div className="alert alert-secondary mb-0">
                    {aperturaAbierta && '🟢 La caja ya está abierta para hoy. Ciérrala al final del día.'}
                    {aperturaCerrada && '🔴 La caja de hoy ya fue cerrada.'}
                  </div>
                ) : (
                  <form onSubmit={registrarApertura}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Dinero en caja (COP) *</label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="100"
                          value={montoApertura}
                          onChange={(e) => setMontoApertura(e.target.value)}
                          placeholder="Ej: 50000"
                          required
                        />
                      </div>
                      <div className="form-text">Si no hay dinero inicial, ingresa 0.</div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Observaciones (opcional)</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={obsApertura}
                        onChange={(e) => setObsApertura(e.target.value)}
                        placeholder="Ej: Billetes de 50.000, monedas..."
                      />
                    </div>
                    <button type="submit" className="btn btn-brand w-100" disabled={loadApertura}>
                      {loadApertura
                        ? <><span className="spinner-border spinner-border-sm me-2" />Registrando...</>
                        : '🌅 Abrir caja'}
                    </button>
                    {msgApertura.text && (
                      <div className={`alert alert-${msgApertura.type === 'danger' ? 'danger' : msgApertura.type === 'success' ? 'success' : 'secondary'} mt-3 mb-0 py-2`}>
                        {msgApertura.text}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Cierre */}
          <div className="col-md-6">
            <div className="card card-soft h-100">
              <div className="card-body">
                <h5 className="mb-1">🌙 Cierre de caja</h5>
                <p className="text-muted small mb-3">Cuenta el dinero al final del día y registra el cierre. Se calculará la diferencia automáticamente.</p>

                {!aperturaAbierta ? (
                  <div className="alert alert-secondary mb-0">
                    {sinApertura    && 'Debes registrar una apertura primero.'}
                    {aperturaCerrada && '🔴 La caja de hoy ya fue cerrada.'}
                  </div>
                ) : (
                  <form onSubmit={registrarCierre}>
                    <div className="mb-2 p-3 rounded" style={{ background: 'var(--bg-soft)' }}>
                      <div className="small text-muted">Apertura registrada</div>
                      <div className="fw-bold">{money(estadoCaja?.monto_apertura)}</div>
                    </div>
                    <div className="mb-3 mt-3">
                      <label className="form-label fw-semibold">Dinero contado en caja (COP) *</label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="100"
                          value={montoCierre}
                          onChange={(e) => setMontoCierre(e.target.value)}
                          placeholder="Cuenta el dinero físico..."
                          required
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Observaciones (opcional)</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={obsCierre}
                        onChange={(e) => setObsCierre(e.target.value)}
                        placeholder="Ej: Gastos del día, novedades..."
                      />
                    </div>
                    <button type="submit" className="btn btn-outline-secondary w-100" disabled={loadCierre}>
                      {loadCierre
                        ? <><span className="spinner-border spinner-border-sm me-2" />Procesando...</>
                        : '🌙 Cerrar caja'}
                    </button>
                    {msgCierre.text && (
                      <div className={`alert alert-${msgCierre.type === 'danger' ? 'danger' : msgCierre.type === 'success' ? 'success' : 'secondary'} mt-3 mb-0 py-2`}>
                        {msgCierre.text}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Historial */}
        <div className="card card-soft mt-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Historial de caja</h5>
              <span className="badge bg-info">{historial.length} días</span>
            </div>
            <div className="table-responsive">
              <table className="table align-middle table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-end">Apertura</th>
                    <th className="text-end">Ventas efectivo</th>
                    <th className="text-end">Cierre</th>
                    <th className="text-end">Diferencia</th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">Sin registros de caja</td></tr>
                  ) : (
                    historial.map((h) => {
                      const [y, m, d] = h.fecha.split('-').map(Number)
                      const fechaLocal = new Date(y, m - 1, d)
                      const dif = Number(h.diferencia ?? 0)
                      return (
                        <tr key={h.id_apertura}>
                          <td>
                            <div className="fw-semibold">
                              {fechaLocal.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            {h.empleados && (
                              <div className="small text-muted">{h.empleados.nombres} {h.empleados.apellidos}</div>
                            )}
                          </td>
                          <td className="text-end">{money(h.monto_apertura)}</td>
                          <td className="text-end">{h.total_ventas_efectivo != null ? money(h.total_ventas_efectivo) : '—'}</td>
                          <td className="text-end">{h.monto_cierre != null ? money(h.monto_cierre) : '—'}</td>
                          <td className={`text-end fw-semibold ${dif > 0 ? 'text-success' : dif < 0 ? 'text-danger' : 'text-muted'}`}>
                            {h.diferencia != null ? money(h.diferencia) : '—'}
                          </td>
                          <td className="text-center">
                            {h.estado === 'abierta'
                              ? <span className="badge bg-success">Abierta</span>
                              : <span className="badge bg-secondary">Cerrada</span>}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}