import { money } from "../../domain/money.js";

// Modal de detalle de una venta. Presentacional.
export default function FacturaDetalleModal({ open, detalle, loading, onClose }) {
  if (!open) return null;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 1050, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: 1055, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", pointerEvents: "none" }}>
        <div className="card border-0 shadow-lg" style={{ width: "100%", maxWidth: 680, borderRadius: "1.25rem", pointerEvents: "all", maxHeight: "90vh", overflowY: "auto" }}>
          <div className="card-header border-0 pt-4 pb-3 px-4" style={{ background: "linear-gradient(135deg, var(--sky, #6cd2f7), var(--aqua, #91eed3))" }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">
                {loading ? "Cargando..." : `Venta #${detalle?.factura?.id_factura}`}
              </h5>
              <button className="btn-close" onClick={onClose} />
            </div>
          </div>
          <div className="card-body p-4">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-brand" role="status" />
              </div>
            ) : detalle ? (
              <>
                {detalle.factura?.anulada && (
                  <div className="alert alert-danger mb-3">
                    <strong>⚠️ Venta anulada</strong>
                    <div className="small mt-1">
                      Motivo: {detalle.factura.motivo_anulacion || "—"}
                      <br />
                      Fecha de anulación: {detalle.factura.fecha_anulacion ? new Date(detalle.factura.fecha_anulacion).toLocaleString("es-CO") : "—"}
                    </div>
                  </div>
                )}
                <div className="row g-3 mb-4">
                  {[
                    { label: "Fecha",    val: new Date(detalle.factura?.fecha_hora).toLocaleString("es-CO") },
                    { label: "Empleado", val: detalle.factura?.empleado_nombres || "N/A" },
                    { label: "Cliente",  val: detalle.factura?.observaciones    || "—" },
                    { label: "Total",    val: money(detalle.factura?.total_neto), bold: true },
                  ].map((s) => (
                    <div className="col-6" key={s.label}>
                      <div className="text-muted small">{s.label}</div>
                      <div className={s.bold ? "fw-bold text-success fs-5" : "fw-semibold"}>{s.val}</div>
                    </div>
                  ))}
                </div>

                <h6 className="fw-bold mb-3">Productos</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="text-center">Cant.</th>
                        <th className="text-end">Precio unit.</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detalle.productos ?? []).map((p, i) => (
                        <tr key={i}>
                          <td>{p.nombre_producto || `Producto #${p.id_producto}`}</td>
                          <td className="text-center"><span className="badge bg-light text-dark border">{p.cantidad}</span></td>
                          <td className="text-end">{money(p.precio_unitario_venta)}</td>
                          <td className="text-end fw-semibold">{money(p.subtotal_linea)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-top">
                      {Number(detalle.factura?.total_iva) > 0 && (
                        <>
                          <tr>
                            <td colSpan={3} className="text-end text-muted">Base gravable</td>
                            <td className="text-end">{money(detalle.factura?.total_base)}</td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="text-end text-muted">IVA</td>
                            <td className="text-end">{money(detalle.factura?.total_iva)}</td>
                          </tr>
                        </>
                      )}
                      <tr>
                        <td colSpan={3} className="text-end fw-bold">Total</td>
                        <td className="text-end fw-bold text-success">{money(detalle.factura?.total_neto)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-muted text-center py-4">No se pudo cargar el detalle</p>
            )}
          </div>
          <div className="card-footer bg-transparent border-0 px-4 pb-4">
            <button className="btn btn-secondary w-100" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </>
  );
}
