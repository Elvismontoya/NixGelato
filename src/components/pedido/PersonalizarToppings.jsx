import { money } from "../../domain/money.js";
import { nombreProducto, precioProducto, nombreTopping, precioTopping } from "../../domain/producto.js";

// Pantalla de personalización con toppings de un producto. Presentacional:
// el estado (producto/seleccionados) y las acciones viven en el contenedor.
export default function PersonalizarToppings({
  producto, toppings, seleccionados, precioFinal, onToggle, onVolver, onAgregar,
}) {
  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <button className="btn btn-outline-secondary" onClick={onVolver}>← Volver al menú</button>
        <h4 className="fw-bold mb-0">🎯 {nombreProducto(producto)}</h4>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <h6 className="fw-bold mb-3">🎯 Elige tus toppings</h6>
          {toppings.length === 0 ? (
            <p className="text-muted">No hay toppings disponibles.</p>
          ) : (
            <div className="row g-2">
              {toppings.map((t) => {
                const activo = !!seleccionados.find((s) => s.id_topping === t.id_topping);
                return (
                  <div className="col-md-4 col-6" key={t.id_topping}>
                    <div
                      className={`topping-card card text-center cursor-pointer ${activo ? "topping-active" : ""}`}
                      onClick={() => onToggle(t)}
                    >
                      <div className="card-body p-3">
                        <div style={{ fontSize: "1.5rem" }}>{activo ? "✅" : "➕"}</div>
                        <div className="fw-semibold small mt-1">{nombreTopping(t)}</div>
                        <div className={`small fw-bold ${activo ? "text-white" : "text-brand"}`}>+{money(precioTopping(t))}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="card border-0 bg-light p-3">
            <h6 className="fw-bold mb-3">📋 Resumen</h6>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted small">Base</span>
              <span className="fw-semibold">{money(precioProducto(producto))}</span>
            </div>
            {seleccionados.map((t) => (
              <div key={t.id_topping} className="d-flex justify-content-between mb-1">
                <span className="text-muted small">{nombreTopping(t)}</span>
                <span className="small">+{money(precioTopping(t))}</span>
              </div>
            ))}
            <div className="d-flex justify-content-between border-top pt-2 mt-2">
              <span className="fw-bold">Total</span>
              <span className="fw-bold text-success fs-5">{money(precioFinal)}</span>
            </div>
            <button className="btn btn-brand w-100 mt-3 btn-lg" onClick={onAgregar}>
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
