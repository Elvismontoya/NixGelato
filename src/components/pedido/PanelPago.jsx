import { money } from "../../domain/money.js";
import { billetesSugeridos, puedeCobrar } from "../../domain/pedido.js";

const BILLETES = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

// Panel de cobro (cliente, método de pago, monto recibido, cambio, botón).
// Presentacional: el estado y las acciones viven en el contenedor (Pedido).
export default function PanelPago({
  cliente, setCliente,
  metodosPago, metodoPago, onSelectMetodo,
  pago, setPago,
  total, cambio, items, cobrandoLoad, onCobrar,
}) {
  const esEfectivo = metodoPago === "Efectivo";
  const hayItems = items.length > 0;

  return (
    <div className="px-4 py-3">
      <div className="mb-3">
        <label className="form-label small fw-semibold">👤 Cliente (opcional)</label>
        <input
          type="text" className="form-control form-control-sm"
          value={cliente} onChange={(e) => setCliente(e.target.value)}
          placeholder="Nombre del cliente"
        />
      </div>

      <div className="mb-3">
        <label className="form-label small fw-semibold">💳 Método de pago</label>
        <div className="d-flex gap-2 flex-wrap">
          {metodosPago.map((m) => (
            <button
              key={m.id}
              className={`btn btn-sm flex-grow-1 ${metodoPago === m.nombre_metodo ? "btn-brand" : "btn-outline-secondary"}`}
              onClick={() => onSelectMetodo(m)}
            >
              {m.nombre_metodo === "Efectivo" ? "💵" : m.nombre_metodo === "Transferencia" ? "📱" : "💳"} {m.nombre_metodo}
            </button>
          ))}
        </div>
      </div>

      {esEfectivo && (
        <div className="mb-3">
          <label className="form-label small fw-semibold">💰 Monto recibido</label>
          <input
            type="number" className="form-control form-control-sm mb-2"
            value={pago || ""} min={0} placeholder="Ingresa el monto..."
            onChange={(e) => setPago(Number(e.target.value))}
          />
          <div className="d-flex flex-wrap gap-1">
            {billetesSugeridos(total, BILLETES).map((b) => (
              <button
                key={b}
                className={`btn btn-xs border px-2 py-1 ${pago === b ? "btn-brand text-white" : "btn-light"}`}
                style={{ fontSize: "0.72rem", borderRadius: 6 }}
                onClick={() => setPago(b)}
              >
                {b >= 1000 ? `$${b / 1000}K` : money(b)}
              </button>
            ))}
            {total > 0 && (
              <button
                className={`btn btn-xs border px-2 py-1 ${pago === total ? "btn-success text-white" : "btn-light"}`}
                style={{ fontSize: "0.72rem", borderRadius: 6 }}
                onClick={() => setPago(total)}
                title="Pago exacto"
              >
                Exacto
              </button>
            )}
          </div>
        </div>
      )}

      {metodoPago && !esEfectivo && (
        <div className="mb-3 p-3 rounded" style={{ background: "var(--bg-soft, #f0fdf4)", border: "1px solid #bbf7d0" }}>
          <div className="d-flex justify-content-between align-items-center">
            <span className="small fw-semibold text-success">📱 Total a transferir</span>
            <span className="fw-bold text-success fs-5">{money(total)}</span>
          </div>
          <div className="small text-muted mt-1">El monto se registra automáticamente</div>
        </div>
      )}

      {esEfectivo && pago > 0 && (
        <div className={`d-flex justify-content-between align-items-center rounded p-2 mb-3 ${cambio >= 0 ? "bg-success bg-opacity-10" : "bg-danger bg-opacity-10"}`}>
          <span className="small fw-semibold">🪙 Cambio</span>
          <span className={`fw-bold ${cambio >= 0 ? "text-success" : "text-danger"}`}>{money(cambio)}</span>
        </div>
      )}

      <button
        className="btn btn-success btn-lg w-100 fw-bold py-3"
        disabled={cobrandoLoad || !puedeCobrar({ items, metodoPago, pago, total })}
        onClick={onCobrar}
      >
        {cobrandoLoad
          ? <><span className="spinner-border spinner-border-sm me-2" />Procesando...</>
          : `💰 COBRAR ${money(total)}`}
      </button>

      {hayItems && !metodoPago && (
        <p className="text-warning small text-center mt-2 mb-0">⚠️ Selecciona método de pago</p>
      )}
      {hayItems && esEfectivo && pago > 0 && pago < total && (
        <p className="text-danger small text-center mt-2 mb-0">⚠️ Faltan {money(total - pago)} para completar el pago</p>
      )}
      {hayItems && esEfectivo && pago <= 0 && (
        <p className="text-warning small text-center mt-2 mb-0">⚠️ Ingresa el monto recibido</p>
      )}
    </div>
  );
}
