import { useId } from "react";
import { money } from "../../domain/money.js";

// Modal de confirmación para anular una venta. Presentacional.
export default function AnularVentaModal({
  factura,
  motivo,
  setMotivo,
  msg,
  loading,
  onConfirm,
  onCancel,
}) {
  const motivoId = useId();
  if (!factura) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1060,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
        }}
        onClick={() => !loading && onCancel()}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1065,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          pointerEvents: "none",
        }}
      >
        <div
          className="card border-0 shadow-lg"
          style={{
            width: "100%",
            maxWidth: 460,
            borderRadius: "1.25rem",
            pointerEvents: "all",
          }}
        >
          <div className="card-body p-4">
            <div className="text-center mb-3">
              <div style={{ fontSize: "2.5rem" }}>🗑️</div>
              <h5 className="fw-bold mt-2 mb-1">¿Anular esta venta?</h5>
              <p className="text-muted small mb-0">
                Venta #{factura.id_factura} por{" "}
                <strong>{money(factura.total_neto)}</strong>
              </p>
              <p className="text-muted small">
                El stock de los productos vendidos será restaurado y la venta
                quedará marcada como anulada (no se elimina, para fines de
                auditoría).
              </p>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor={motivoId}>
                Motivo de anulación *
              </label>
              <textarea
                id={motivoId}
                className="form-control"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Producto equivocado, error de cobro, cliente canceló..."
                autoFocus
              />
            </div>

            {msg.text && (
              <div
                className={`alert alert-${msg.type === "danger" ? "danger" : "success"} py-2 mb-3`}
              >
                {msg.text}
              </div>
            )}

            <div className="d-flex gap-2 justify-content-center">
              <button
                className="btn btn-outline-secondary px-4"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger px-4"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Anulando...
                  </>
                ) : (
                  "Anular venta"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
