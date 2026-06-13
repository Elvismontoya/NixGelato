import { useState } from 'react'

const getToken = () => localStorage.getItem('token') || ''

export default function ModalAperturaCaja({ onCajaAbierta, rol = 'admin' }) {
  const [monto,   setMonto]   = useState('')
  const [obs,     setObs]     = useState('')
  const [msg,     setMsg]     = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  const esAdmin = rol === 'admin'

  async function handleSubmit(e) {
    e.preventDefault()
    const montoNum = Number(monto)
    if (isNaN(montoNum) || montoNum < 0) {
      setMsg({ text: 'Ingresa un monto válido (puede ser 0)', type: 'danger' })
      return
    }

    setLoading(true)
    setMsg({ text: 'Registrando apertura...', type: 'muted' })

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/caja/apertura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ monto_apertura: montoNum, observaciones: obs }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // 409 = ya existe apertura hoy (otro usuario la abrió), dejar pasar
        if (res.status === 409) {
          onCajaAbierta()
          return
        }
        setMsg({ text: data.message || 'Error al registrar apertura', type: 'danger' })
        return
      }

      setMsg({ text: '✅ Caja abierta. ¡Buen día!', type: 'success' })
      setTimeout(() => onCajaAbierta(), 900)
    } catch (err) {
      console.error(err)
      setMsg({ text: 'Error al conectar con el servidor', type: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop que bloquea todo */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1050,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
      }} />

      {/* Modal centrado */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1055,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}>
        <div
          className="card border-0 shadow-lg"
          style={{ width: '100%', maxWidth: '440px', borderRadius: '1.25rem' }}
        >
          <div className="card-body p-4">

            {/* Header */}
            <div className="text-center mb-4">
              <div style={{ fontSize: '2.5rem' }}>💰</div>
              <h4 className="fw-bold mb-1 mt-2">Apertura de caja</h4>
              <p className="text-muted small mb-0">
                {esAdmin
                  ? 'Ingresa el dinero disponible en caja para comenzar el día.'
                  : 'La caja no ha sido abierta aún. Ingresa el efectivo disponible para continuar.'}
              </p>
            </div>

            {/* Fecha */}
            <div
              className="text-center mb-4 py-2 rounded"
              style={{ background: 'var(--bg-soft, #f8f9fa)' }}
            >
              <span className="small text-muted">
                📅 {new Date().toLocaleDateString('es-CO', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Dinero en caja (COP) <span className="text-danger">*</span>
                </label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text">$</span>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="100"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Ej: 50000"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-text">Si no hay dinero inicial, ingresa 0.</div>
              </div>

              <div className="mb-4">
                <label className="form-label">
                  Observaciones <span className="text-muted">(opcional)</span>
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Ej: billetes de $50.000, monedas..."
                />
              </div>

              {msg.text && (
                <div className={`alert py-2 mb-3 alert-${msg.type === 'danger' ? 'danger' : msg.type === 'success' ? 'success' : 'secondary'}`}>
                  {msg.text}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-brand w-100 btn-lg"
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Registrando...</>
                  : '🌅 Abrir caja y continuar'}
              </button>
            </form>

            <p className="text-center text-muted small mt-3 mb-0">
              Este paso es obligatorio para operar el sistema cada día.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}