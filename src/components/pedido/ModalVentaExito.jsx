import { money } from "../../domain/money.js";

// Modal de confirmación tras registrar una venta. Presentacional.
export default function ModalVentaExito({ venta, onImprimir, onNuevaVenta }) {
  if (!venta) return null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 1060, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1065, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div className="card border-0 shadow-lg text-center" style={{ maxWidth: 400, width: "100%", borderRadius: "1.25rem" }}>
          <div className="card-body p-5">
            <div style={{ fontSize: "3.5rem" }}>✅</div>
            <h4 className="fw-bold mt-3 mb-1">¡Venta registrada!</h4>
            <p className="text-muted mb-1">Factura <strong>#{venta.id_factura}</strong></p>
            <div className="my-3 py-3 rounded" style={{ background: "var(--bg-soft, #f8f9fa)" }}>
              <div className="text-muted small">Total cobrado</div>
              <div className="fw-bold text-success" style={{ fontSize: "1.8rem" }}>{money(venta.total)}</div>
            </div>
            <div className="d-flex gap-2 justify-content-center mt-3">
              <button className="btn btn-outline-secondary" onClick={onImprimir}>
                🖨️ Imprimir ticket
              </button>
              <button className="btn btn-brand px-4" onClick={onNuevaVenta}>
                Nueva venta →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
