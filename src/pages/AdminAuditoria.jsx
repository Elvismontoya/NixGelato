import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import Footer from "../components/Footer.jsx";

const money = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });
const getToken = () => localStorage.getItem("token") || "";

const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseYMD = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const ACCION_COLOR = {
  INSERT: "bg-success",
  UPDATE: "bg-warning text-dark",
  DELETE: "bg-danger",
};

export default function AdminAuditoria() {
  const navigate = useNavigate();

  const hoy        = useMemo(() => new Date(), []);
  const sieteAtras = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; }, []);

  const [fechaDesde, setFechaDesde] = useState(toYMD(sieteAtras));
  const [fechaHasta, setFechaHasta] = useState(toYMD(hoy));

  const [ingresosDia,  setIngresosDia]  = useState([]);
  const [auditoria,    setAuditoria]    = useState([]);
  const [ingresosHoy,  setIngresosHoy]  = useState(null);
  const [cargando,     setCargando]     = useState(true);
  const [loadingIngr,  setLoadingIngr]  = useState(true);
  const [loadingAud,   setLoadingAud]   = useState(true);

  // Filtros auditoría
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroAccion, setFiltroAccion] = useState("");
  const [filtroTabla,  setFiltroTabla]  = useState("");

  // Paginación auditoría
  const POR_PAGINA = 15;
  const [pagina, setPagina] = useState(1);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  }

  // ── Totales ingresos ──────────────────────────────────────
  const { totalIngresos, totalVentas, promedioVenta } = useMemo(() => {
    const tIng = ingresosDia.reduce((s, it) => s + (Number(it.ingresos_totales) || 0), 0);
    const tVen = ingresosDia.reduce((s, it) => s + (Number(it.total_ventas)    || 0), 0);
    return { totalIngresos: tIng, totalVentas: tVen, promedioVenta: tVen > 0 ? tIng / tVen : 0 };
  }, [ingresosDia]);

  // ── Filtrado auditoría ────────────────────────────────────
  const auditoriaFiltrada = useMemo(() => {
    const q = busqueda.toLowerCase();
    return auditoria.filter((it) => {
      if (filtroAccion && it.accion !== filtroAccion) return false;
      if (filtroTabla  && it.tabla_afectada !== filtroTabla) return false;
      if (q && !(
        (it.descripcion || "").toLowerCase().includes(q) ||
        (it.empleado    || "").toLowerCase().includes(q) ||
        (it.producto    || "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [auditoria, busqueda, filtroAccion, filtroTabla]);

  const totalPaginas   = Math.max(1, Math.ceil(auditoriaFiltrada.length / POR_PAGINA));
  const auditoriaPage  = auditoriaFiltrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Opciones únicas para filtros
  const accionesUnicas = useMemo(() => [...new Set(auditoria.map(a => a.accion).filter(Boolean))].sort(), [auditoria]);
  const tablasUnicas   = useMemo(() => [...new Set(auditoria.map(a => a.tabla_afectada).filter(Boolean))].sort(), [auditoria]);

  // Reset página al filtrar
  useEffect(() => { setPagina(1); }, [busqueda, filtroAccion, filtroTabla]);

  // ── Fetchers ──────────────────────────────────────────────
  async function cargarIngresosPorDia(d = fechaDesde, h = fechaHasta) {
    setLoadingIngr(true);
    try {
      const params = new URLSearchParams();
      if (d) params.append("fecha_desde", d);
      if (h) params.append("fecha_hasta", h);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/facturas/ingresos-por-dia?${params}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIngresosDia(Array.isArray(data) ? data : []);
    } catch {
      setIngresosDia([]);
    } finally {
      setLoadingIngr(false);
    }
  }

  async function cargarAuditoria() {
    setLoadingAud(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auditoria?limit=500`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAuditoria(Array.isArray(data) ? data : []);
    } catch {
      setAuditoria([]);
    } finally {
      setLoadingAud(false);
    }
  }

  async function cargarIngresosHoy() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auditoria/ingresos-hoy`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (res.ok) setIngresosHoy(await res.json());
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    setCargando(true);
    Promise.all([cargarIngresosPorDia(), cargarAuditoria(), cargarIngresosHoy()])
      .finally(() => setCargando(false));
  }, []);

  // ── Loading inicial ───────────────────────────────────────
  if (cargando) {
    return (
      <>
        <AdminNavbar onLogout={logout} />
        <main className="container my-4">
          <div className="text-center py-5">
            <div className="spinner-border text-brand" role="status" />
            <p className="mt-3">Cargando auditoría e ingresos...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminNavbar onLogout={logout} />

      <main className="container my-4">
        {/* Hero */}
        <section className="hero mb-4 text-center fade-in">
          <h1 className="display-6 fw-bold mb-2">Auditoría e Ingresos</h1>
          <p className="lead mb-0">Registro de todas las acciones realizadas en el sistema.</p>
        </section>

        {/* Stats */}
        <div className="row g-3 mb-4">
          {[
            { label: "Ingresos hoy",      value: money(ingresosHoy?.ingresos_totales ?? 0), sub: `${ingresosHoy?.total_ventas ?? 0} ventas hoy` },
            { label: "Total ingresos",    value: money(totalIngresos),   sub: "Período seleccionado" },
            { label: "Ventas totales",    value: totalVentas,            sub: "Facturas registradas" },
            { label: "Promedio x venta",  value: money(promedioVenta),   sub: "Valor promedio" },
          ].map((s) => (
            <div className="col-6 col-md-3" key={s.label}>
              <div className="card card-soft h-100 text-center p-3">
                <div className="text-muted small">{s.label}</div>
                <div className="h4 fw-bold text-gradient mt-1">{s.value}</div>
                <small className="text-muted">{s.sub}</small>
              </div>
            </div>
          ))}
        </div>

        {/* Filtro fechas */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <h5 className="mb-3">📅 Filtro de ingresos por período</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Desde</label>
                <input type="date" className="form-control" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Hasta</label>
                <input type="date" className="form-control" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
              </div>
              <div className="col-md-4 d-flex align-items-end gap-2">
                <button className="btn btn-brand flex-grow-1" onClick={() => cargarIngresosPorDia(fechaDesde, fechaHasta)}>
                  Aplicar
                </button>
                <button className="btn btn-outline-secondary" onClick={() => { cargarAuditoria(); cargarIngresosHoy(); cargarIngresosPorDia(); }} title="Actualizar">
                  🔄
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ingresos por día */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">💵 Ingresos por día</h5>
              <span className="badge bg-info">{ingresosDia.length} días</span>
            </div>
            <div className="table-responsive" style={{ maxHeight: 380 }}>
              <table className="table align-middle table-hover">
                <thead style={{ position: "sticky", top: 0, background: "var(--white, #fff)", zIndex: 1 }}>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-center">Ventas</th>
                    <th className="text-end">Ingresos</th>
                    <th className="text-end">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingIngr ? (
                    <tr><td colSpan={4}><div className="placeholder-wave"><span className="placeholder col-12" /></div></td></tr>
                  ) : ingresosDia.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-4">Sin datos en el período seleccionado</td></tr>
                  ) : (
                    ingresosDia.map((it, i) => {
                      const fecha = parseYMD(it.fecha);
                      return (
                        <tr key={i}>
                          <td className="fw-semibold">
                            {fecha ? fecha.toLocaleDateString("es-CO", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : it.fecha}
                          </td>
                          <td className="text-center"><span className="badge bg-info">{it.total_ventas}</span></td>
                          <td className="text-end fw-bold text-gradient">{money(it.ingresos_totales)}</td>
                          <td className="text-end text-muted">{money(it.promedio_venta)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Auditoría */}
        <div className="card card-soft">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">📋 Historial de auditoría</h5>
              <span className="badge bg-info">{auditoriaFiltrada.length} registros</span>
            </div>

            {/* Filtros auditoría */}
            <div className="row g-2 mb-3">
              <div className="col-md-5">
                <input
                  className="form-control"
                  placeholder="Buscar por empleado, descripción o producto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select className="form-select" value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)}>
                  <option value="">Todas las acciones</option>
                  {accionesUnicas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <select className="form-select" value={filtroTabla} onChange={(e) => setFiltroTabla(e.target.value)}>
                  <option value="">Todas las tablas</option>
                  {tablasUnicas.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-1 d-flex">
                <button className="btn btn-outline-secondary w-100" onClick={() => { setBusqueda(""); setFiltroAccion(""); setFiltroTabla(""); }} title="Limpiar filtros">✕</button>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: 520 }}>
              <table className="table align-middle table-hover">
                <thead style={{ position: "sticky", top: 0, background: "var(--white, #fff)", zIndex: 1 }}>
                  <tr>
                    <th style={{ minWidth: 150 }}>Fecha/Hora</th>
                    <th>Empleado</th>
                    <th className="text-center">Acción</th>
                    <th>Tabla</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAud ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}><td colSpan={5}><div className="placeholder-wave"><span className="placeholder col-12" /></div></td></tr>
                    ))
                  ) : auditoriaPage.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-5">No hay registros con ese filtro</td></tr>
                  ) : (
                    auditoriaPage.map((it) => (
                      <tr key={it.id_auditoria}>
                        <td className="small text-muted" style={{ whiteSpace: "nowrap" }}>
                          {new Date(it.fecha_hora).toLocaleString("es-CO", {
                            year: "numeric", month: "2-digit", day: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {it.empleado || "Sistema"}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`badge ${ACCION_COLOR[it.accion] || "bg-secondary"}`}>
                            {it.accion}
                          </span>
                        </td>
                        <td>
                          {it.tabla_afectada
                            ? <code className="small">{it.tabla_afectada}</code>
                            : <span className="text-muted">—</span>}
                          {it.producto && (
                            <div className="small text-muted mt-1">📦 {it.producto}</div>
                          )}
                        </td>
                        <td className="small">
                          {it.descripcion?.trim() || <span className="text-muted">—</span>}
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
                  Página {pagina} de {totalPaginas} · {auditoriaFiltrada.length} registros
                </small>
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setPagina(1)} disabled={pagina === 1}>«</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>‹</button>
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    const start = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
                    const p = start + i;
                    return p <= totalPaginas ? (
                      <button
                        key={p}
                        className={`btn btn-sm ${p === pagina ? 'btn-brand' : 'btn-outline-secondary'}`}
                        onClick={() => setPagina(p)}
                      >{p}</button>
                    ) : null;
                  })}
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>›</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}>»</button>
                </div>
              </div>
            )}

            <p className="small text-muted mt-2 mb-0">
              Mostrando {auditoriaPage.length} de {auditoriaFiltrada.length} registros
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}