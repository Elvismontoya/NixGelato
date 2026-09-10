import { money } from "../../domain/money.js";

// Pestaña de dashboard del panel admin. Presentacional: recibe `dash`
// (métricas ya cargadas), `loading` y `onReload`.
export default function DashboardTab({ dash, loading, onReload }) {
  if (loading) {
    return (
      <div className="fade-in">
        <div className="text-center py-5">
          <div className="spinner-border text-brand" role="status" />
          <p className="mt-3 text-muted">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const semana = dash?.semana ?? [];
  const stockBajo = dash?.stockBajo ?? [];

  const metricas = [
    {
      icon: "💵",
      label: "Ingresos hoy",
      value: money(dash?.ingresosHoy?.ingresos_totales ?? 0),
      sub: `${dash?.ingresosHoy?.total_ventas ?? 0} ventas`,
      color: "text-success",
    },
    {
      icon: "🧾",
      label: "Promedio x venta",
      value: money(dash?.ingresosHoy?.promedio_venta ?? 0),
      sub: "Hoy",
      color: "text-brand",
    },
    {
      icon: "📦",
      label: "Stock crítico",
      value: stockBajo.length,
      sub: "Productos bajo mínimo",
      color: stockBajo.length > 0 ? "text-danger" : "text-success",
    },
    {
      icon: "💰",
      label: "Caja hoy",
      value: dash?.estadoCaja?.apertura
        ? money(dash.estadoCaja.apertura.monto_apertura)
        : "Sin apertura",
      sub:
        dash?.estadoCaja?.apertura?.estado === "abierta"
          ? "🟢 Abierta"
          : dash?.estadoCaja?.apertura?.estado === "cerrada"
            ? "🔴 Cerrada"
            : "⚪ Sin registrar",
      color: "text-gradient",
    },
  ];

  const hoyStr = new Date().toISOString().split("T")[0];
  const maxVal = Math.max(...semana.map((d) => d.ingresos_totales), 1);
  const dias = [...semana].sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha),
  );
  const mejorDia = semana.length
    ? [...semana].sort((a, b) => b.ingresos_totales - a.ingresos_totales)[0]
    : null;

  return (
    <div className="fade-in">
      {/* Fila 1: Métricas del día */}
      <div className="row g-3 mb-4">
        {metricas.map((s) => (
          <div className="col-6 col-md-3" key={s.label}>
            <div className="card card-soft h-100 text-center p-3">
              <div style={{ fontSize: "1.8rem" }}>{s.icon}</div>
              <div className="text-muted small mt-1">{s.label}</div>
              <div className={`h5 fw-bold mt-1 ${s.color}`}>{s.value}</div>
              <div className="small text-muted">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Gráfica de ingresos últimos 7 días */}
        <div className="col-lg-7">
          <div className="card card-soft h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">📈 Ingresos últimos 7 días</h6>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={onReload}
                >
                  🔄
                </button>
              </div>
              {semana.length === 0 ? (
                <div className="text-center text-muted py-4">
                  Sin ventas en los últimos 7 días
                </div>
              ) : (
                <div
                  className="d-flex align-items-end gap-2"
                  style={{ height: 180 }}
                >
                  {dias.map((d, i) => {
                    const pct = Math.max(
                      (d.ingresos_totales / maxVal) * 100,
                      4,
                    );
                    const fecha = new Date(d.fecha + "T12:00:00");
                    const esHoy = d.fecha === hoyStr;
                    return (
                      <div
                        key={i}
                        className="d-flex flex-column align-items-center flex-grow-1"
                        style={{ height: "100%" }}
                      >
                        <div
                          className="small text-muted mb-1"
                          style={{ fontSize: "0.65rem" }}
                        >
                          {money(d.ingresos_totales).replace("COP", "").trim()}
                        </div>
                        <div
                          className="w-100 rounded-top position-relative"
                          style={{
                            height: `${pct}%`,
                            background: esHoy
                              ? "linear-gradient(180deg, var(--sky, #6cd2f7), var(--aqua, #91eed3))"
                              : "rgba(108, 210, 247, 0.35)",
                            minHeight: 8,
                            transition: "height .4s ease",
                          }}
                          title={`${d.total_ventas} ventas · ${money(d.ingresos_totales)}`}
                        />
                        <div
                          className="small text-muted mt-1"
                          style={{ fontSize: "0.65rem" }}
                        >
                          {fecha.toLocaleDateString("es-CO", {
                            weekday: "short",
                          })}
                        </div>
                        <div
                          style={{
                            fontSize: "0.6rem",
                            color: esHoy ? "var(--sky)" : "transparent",
                            fontWeight: 700,
                          }}
                        >
                          ●
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {semana.length > 0 && (
                <div className="row g-2 mt-3 pt-3 border-top">
                  <div className="col-4 text-center">
                    <div className="small text-muted">Total semana</div>
                    <div className="fw-bold text-success">
                      {money(
                        semana.reduce(
                          (s, d) => s + Number(d.ingresos_totales),
                          0,
                        ),
                      )}
                    </div>
                  </div>
                  <div className="col-4 text-center">
                    <div className="small text-muted">Ventas semana</div>
                    <div className="fw-bold">
                      {semana.reduce((s, d) => s + Number(d.total_ventas), 0)}
                    </div>
                  </div>
                  <div className="col-4 text-center">
                    <div className="small text-muted">Mejor día</div>
                    <div
                      className="fw-bold text-brand"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {mejorDia
                        ? new Date(
                            mejorDia.fecha + "T12:00:00",
                          ).toLocaleDateString("es-CO", {
                            weekday: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stock crítico */}
        <div className="col-lg-5">
          <div className="card card-soft h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">⚠️ Stock crítico</h6>
                <span
                  className={`badge ${stockBajo.length > 0 ? "bg-danger" : "bg-success"}`}
                >
                  {stockBajo.length}
                </span>
              </div>
              {stockBajo.length === 0 ? (
                <div className="text-center py-4">
                  <div style={{ fontSize: "2rem" }}>✅</div>
                  <p className="text-success small mt-2 mb-0">
                    Todos los productos tienen stock suficiente
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: 240, overflowY: "auto" }}>
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="text-center">Stock</th>
                        <th className="text-center">Mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockBajo.map((p) => (
                        <tr key={p.id_producto}>
                          <td className="small fw-semibold">
                            {p.nombre_producto}
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge ${p.stock_actual === 0 ? "bg-danger" : "bg-warning text-dark"}`}
                            >
                              {p.stock_actual}
                            </span>
                          </td>
                          <td className="text-center text-muted small">
                            {p.stock_minimo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                className="btn btn-sm btn-outline-brand w-100 mt-2"
                onClick={() => {
                  window.location.href = "/admin/inventario";
                }}
              >
                Ver inventario completo →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
