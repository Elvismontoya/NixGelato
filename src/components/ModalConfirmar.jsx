// Modal de confirmación reutilizable
// Uso: <ModalConfirmar config={modalConfig} onConfirm={fn} onCancel={fn} />

export default function ModalConfirmar({ config, onConfirm, onCancel }) {
  if (!config) return null

  const {
    titulo    = '¿Estás seguro?',
    mensaje   = 'Esta acción no se puede deshacer.',
    detalle   = null,       // nombre del elemento a eliminar
    tipo      = 'danger',   // danger | warning | info
    txtOk     = 'Confirmar',
    txtCancel = 'Cancelar',
    loading   = false,
  } = config

  const iconos = { danger: '🗑️', warning: '⚠️', info: 'ℹ️' }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1060,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
      }} onClick={!loading ? onCancel : undefined} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 1065,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        pointerEvents: 'none',
      }}>
        <div
          className="card border-0 shadow-lg"
          style={{
            width: '100%', maxWidth: '420px',
            borderRadius: '1.25rem',
            pointerEvents: 'all',
          }}
        >
          <div className="card-body p-4 text-center">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {iconos[tipo] || '⚠️'}
            </div>
            <h5 className="fw-bold mb-2">{titulo}</h5>
            <p className="text-muted mb-1">{mensaje}</p>

            {detalle && (
              <div
                className="mt-2 mb-3 px-3 py-2 rounded fw-semibold"
                style={{ background: 'var(--bg-soft, #f8f9fa)', fontSize: '0.95rem' }}
              >
                {detalle}
              </div>
            )}

            <div className="d-flex gap-2 justify-content-center mt-4">
              <button
                className="btn btn-outline-secondary px-4"
                onClick={onCancel}
                disabled={loading}
              >
                {txtCancel}
              </button>
              <button
                className={`btn btn-${tipo} px-4`}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Procesando...</>
                  : txtOk}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}