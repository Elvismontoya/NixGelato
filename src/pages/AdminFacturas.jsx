import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import CajeroNavbar from "../components/CajeroNavbar.jsx";
import Footer from "../components/Footer.jsx";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";
const POR_PAGINA = 20;

export default function AdminFacturas() {
  const navigate = useNavigate();

  const hoy        = useMemo(() => new Date(), []);
  const treintaDias = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; }, []);

  const [fechaDesde, setFechaDesde] = useState(treintaDias.toISOString().split("T")[0]);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split("T")[0]);
  const [empleados,  setEmpleados]  = useState([]);
  const [idEmpleado, setIdEmpleado] = useState("");
  const [busqueda,   setBusqueda]   = useState("");

  const [facturas,   setFacturas]   = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [pagina,     setPagina]     = useState(1);

  const [showModal,  setShowModal]  = useState(false);
  const [detalle,    setDetalle]    = useState(null);
  const [loadDetalle, setLoadDetalle] = useState(false);

  // Auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol   = localStorage.getItem("rol");
    if (!token) { navigate("/login", { replace: true }); return; }
    if (rol !== "admin" && rol !== "cajero") { navigate("/facturas", { replace: true }); }
  }, [navigate]);

  const rol    = localStorage.getItem("rol") || "";
  const Navbar = rol === "cajero" ? CajeroNavbar : AdminNavbar;

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  }

  // ── Fetchers ──────────────────────────────────────────────
  async function cargarEmpleados() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/empleados?limit=100`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmpleados(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) { console.error(e); }
  }

  async function cargarFacturas(fIni = fechaDesde, fFin = fechaHasta, emp = idEmpleado) {
    setCargando(true);
    setPagina(1);
    try {
      const params = new URLSearchParams();
      if (fIni) params.append("fecha_desde", fIni);
      if (fFin) params.append("fecha_hasta",  fFin);
      if (emp)  params.append("id_empleado",  emp);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/facturas?${params}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFacturas(Array.isArray(data) ? data : []);
    } catch {
      setFacturas([]);
    } finally {
      setCargando(false);
    }
  }

  async function verDetalle(id) {
    setLoadDetalle(true);
    setShowModal(true);
    setDetalle(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/facturas/${id}/detalle`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error();
      setDetalle(await res.json());
    } catch {
      setDetalle(null);
      setShowModal(false);
      alert("Error al cargar el detalle");
    } finally {
      setLoadDetalle(false);
    }
  }

  useEffect(() => {
    cargarEmpleados();
    cargarFacturas();
  }, []);

  // ── Filtro local por búsqueda ─────────────────────────────
  const facturasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return facturas;
    return facturas.filter((f) =>
      String(f.id_factura).includes(q) ||
      (f.empleado_nombres || "").toLowerCase().includes(q) ||
      (f.observaciones   || "").toLowerCase().includes(q)
    );
  }, [facturas, busqueda]);

  // Reset página al buscar
  useEffect(() => { setPagina(1); }, [busqueda]);

  // ── Paginación ────────────────────────────────────────────
  const totalPaginas  = Math.max(1, Math.ceil(facturasFiltradas.length / POR_PAGINA));
  const facturasPagina = facturasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // ── KPIs ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalNeto  = facturasFiltradas.reduce((s, f) => s + Number(f.total_neto  || 0), 0);
    const descuentos = facturasFiltradas.reduce((s, f) => s + Number(f.descuento_total || 0), 0);
    const totalBruto = facturasFiltradas.reduce((s, f) => s + Number(f.total_bruto || 0), 0);
    const n = facturasFiltradas.length;
    return { n, totalNeto, descuentos, totalBruto, promedio: n ? totalNeto / n : 0 };
  }, [facturasFiltradas]);

  // ── Exportar CSV ──────────────────────────────────────────
  function exportCSV() {
    if (!facturasFiltradas.length) return;
    const cols = [
      ["ID",         (f) => f.id_factura],
      ["Fecha/Hora", (f) => new Date(f.fecha_hora).toLocaleString("es-CO")],
      ["Empleado",   (f) => f.empleado_nombres ?? ""],
      ["Cliente",    (f) => f.observaciones    ?? ""],
      ["Subtotal",   (f) => f.total_bruto      ?? 0],
      ["Descuento",  (f) => f.descuento_total  ?? 0],
      ["Total",      (f) => f.total_neto       ?? 0],
    ];
    const csv = [
      cols.map(([h]) => h).join(","),
      ...facturasFiltradas.map((f) =>
        cols.map(([, fn]) => `"${String(fn(f)).replaceAll('"', '""')}"`).join(",")
      ),
    ].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })),
      download: `ventas_${fechaDesde}_${fechaHasta}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      <Navbar onLogout={logout} />

      <main className="container my-4">
        <section className="hero mb-4 text-center fade-in">
          <h1 className="display-6 fw-bold mb-2">Resumen de Ventas</h1>
          <p className="lead mb-0">Consulta y gestiona todas las ventas del sistema.</p>
        </section>

        {/* KPIs */}
        <div className="row g-3 mb-4">
          {[
            { label: "Total ventas",      val: kpis.n,              fmt: (v) => v },
            { label: "Ingresos netos",    val: kpis.totalNeto,      fmt: money },
            { label: "Descuentos",        val: kpis.descuentos,     fmt: money },
            { label: "Promedio x venta",  val: kpis.promedio,       fmt: money },
          ].map((s) => (
            <div className="col-6 col-md-3" key={s.label}>
              <div className="card card-soft h-100 text-center p-3">
                <div className="text-muted small">{s.label}</div>
                <div className="h4 fw-bold text-gradient mt-1">{s.fmt(s.val)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <h5 className="mb-3">Filtros</h5>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Desde</label>
                <input type="date" className="form-control" value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Hasta</label>
                <input type="date" className="form-control" value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)} />
              </div>
              {rol === "admin" && (
                <div className="col-md-3">
                  <label className="form-label">Empleado</label>
                  <select className="form-select" value={idEmpleado}
                    onChange={(e) => setIdEmpleado(e.target.value)}>
                    <option value="">Todos</option>
                    {empleados.map((e) => (
                      <option key={e.id_empleado} value={e.id_empleado}>
                        {e.nombres} {e.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={`col-md-${rol === "admin" ? 3 : 6} d-flex align-items-end gap-2`}>
                <button className="btn btn-brand flex-grow-1"
                  onClick={() => cargarFacturas(fechaDesde, fechaHasta, idEmpleado)}>
                  Aplicar
                </button>
                <button className="btn btn-outline-secondary"
                  onClick={() => cargarFacturas(fechaDesde, fechaHasta, idEmpleado)}
                  title="Actualizar">🔄</button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="card card-soft">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0">Ventas</h5>
                <span className="badge bg-info">{facturasFiltradas.length}</span>
              </div>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <input
                  className="form-control form-control-sm"
                  style={{ width: 220 }}
                  placeholder="Buscar por ID, empleado, cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <button className="btn btn-sm btn-outline-brand" onClick={exportCSV}
                  disabled={!facturasFiltradas.length} title="Exportar CSV">
                  ⬇️ CSV
                </button>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: 520 }}>
              <table className="table table-hover align-middle">
                <thead style={{ position: "sticky", top: 0, background: "var(--white, #fff)", zIndex: 1 }}>
                  <tr>
                    <th>#</th>
                    <th>Fecha/Hora</th>
                    <th>Empleado</th>
                    <th>Cliente</th>
                    <th className="text-end">Subtotal</th>
                    <th className="text-end">Desc.</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}><td colSpan={8}>
                        <div className="placeholder-wave"><span className="placeholder col-12" /></div>
                      </td></tr>
                    ))
                  ) : facturasPagina.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted py-5">
                      {busqueda ? `Sin resultados para "${busqueda}"` : "Sin ventas en el período seleccionado"}
                    </td></tr>
                  ) : (
                    facturasPagina.map((f) => (
                      <tr key={f.id_factura}>
                        <td className="fw-semibold text-muted small">#{f.id_factura}</td>
                        <td className="small">{new Date(f.fecha_hora).toLocaleString("es-CO")}</td>
                        <td><span className="badge bg-light text-dark border">{f.empleado_nombres || "N/A"}</span></td>
                        <td className="small text-muted">{f.observaciones || "—"}</td>
                        <td className="text-end small">{money(f.total_bruto)}</td>
                        <td className="text-end small text-danger">{f.descuento_total > 0 ? `-${money(f.descuento_total)}` : "—"}</td>
                        <td className="text-end fw-bold text-success">{money(f.total_neto)}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-brand"
                            onClick={() => verDetalle(f.id_factura)}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">
                  Página {pagina} de {totalPaginas} · {facturasFiltradas.length} registros
                </small>
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setPagina(1)} disabled={pagina === 1}>«</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>‹</button>
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    const start = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
                    const p = start + i;
                    return p <= totalPaginas ? (
                      <button key={p}
                        className={`btn btn-sm ${p === pagina ? "btn-brand" : "btn-outline-secondary"}`}
                        onClick={() => setPagina(p)}>{p}</button>
                    ) : null;
                  })}
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>›</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}>»</button>
                </div>
              </div>
            )}

            <p className="small text-muted mt-2 mb-0">
              Mostrando {facturasPagina.length} de {facturasFiltradas.length} ventas
            </p>
          </div>
        </div>
      </main>

      {/* Modal detalle */}
      {showModal && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1050, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => setShowModal(false)} />
          <div style={{ position: "fixed", inset: 0, zIndex: 1055, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", pointerEvents: "none" }}>
            <div className="card border-0 shadow-lg" style={{ width: "100%", maxWidth: 680, borderRadius: "1.25rem", pointerEvents: "all", maxHeight: "90vh", overflowY: "auto" }}>
              <div className="card-header border-0 pt-4 pb-3 px-4" style={{ background: "linear-gradient(135deg, var(--sky, #6cd2f7), var(--aqua, #91eed3))" }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">
                    {loadDetalle ? "Cargando..." : `Venta #${detalle?.factura?.id_factura}`}
                  </h5>
                  <button className="btn-close" onClick={() => setShowModal(false)} />
                </div>
              </div>
              <div className="card-body p-4">
                {loadDetalle ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-brand" role="status" />
                  </div>
                ) : detalle ? (
                  <>
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
                <button className="btn btn-secondary w-100" onClick={() => setShowModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </>
      )}

      <Footer />
    </>
  );
}