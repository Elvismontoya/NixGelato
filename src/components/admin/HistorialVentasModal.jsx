import { money } from "../../domain/money.js";

// Modal de historial de ventas de un producto. Presentacional: recibe los
// datos y un onClose; no gestiona estado ni fetch.
export default function HistorialVentasModal({
  modal,
  data,
  loading,
  onClose,
}) {
  if (!modal) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1050,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1055,
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
            maxWidth: 600,
            borderRadius: "1.25rem",
            pointerEvents: "all",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          <div
            className="card-header border-0 pt-4 pb-3 px-4"
            style={{
              background:
                "linear-gradient(135deg, var(--sky, #6cd2f7), var(--aqua, #91eed3))",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">
                📊 Historial de ventas — {modal.nombre}
              </h5>
              <button className="btn-close" onClick={onClose} />
            </div>
          </div>
          <div className="card-body p-4">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-brand" role="status" />
              </div>
            ) : data?.error ? (
              <p className="text-muted text-center py-4">
                No se pudo cargar el historial
              </p>
            ) : (
              <>
                <div className="row g-3 mb-4">
                  {[
                    {
                      label: "Unidades vendidas",
                      val: data?.resumen?.total_unidades ?? 0,
                    },
                    {
                      label: "Ventas registradas",
                      val: data?.resumen?.total_ventas ?? 0,
                    },
                    {
                      label: "Ingresos generados",
                      val: money(data?.resumen?.total_ingresos ?? 0),
                    },
                  ].map((s) => (
                    <div className="col-4" key={s.label}>
                      <div className="card card-soft text-center p-3">
                        <div className="text-muted small">{s.label}</div>
                        <div className="h5 fw-bold text-gradient mt-1">
                          {s.val}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <h6 className="fw-bold mb-2">Ventas por día</h6>
                {(data?.por_dia ?? []).length === 0 ? (
                  <p className="text-muted text-center py-3">
                    Este producto aún no tiene ventas registradas
                  </p>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: 280 }}>
                    <table className="table table-sm align-middle">
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          background: "var(--white, #fff)",
                        }}
                      >
                        <tr>
                          <th>Fecha</th>
                          <th className="text-center">Unidades</th>
                          <th className="text-center">Ventas</th>
                          <th className="text-end">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.por_dia.map((d) => (
                          <tr key={d.fecha}>
                            <td className="small fw-semibold">
                              {new Date(
                                d.fecha + "T12:00:00",
                              ).toLocaleDateString("es-CO", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="text-center">
                              <span className="badge bg-info">
                                {d.unidades}
                              </span>
                            </td>
                            <td className="text-center text-muted small">
                              {d.ventas}
                            </td>
                            <td className="text-end fw-semibold text-success">
                              {money(d.ingresos)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="card-footer bg-transparent border-0 px-4 pb-4">
            <button className="btn btn-secondary w-100" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
