import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import CajeroNavbar from "../components/CajeroNavbar.jsx";
import Footer from "../components/Footer.jsx";
import { getEmpleados } from "../api/empleados.js";
import {
  getFacturas,
  getFacturaDetalle,
  anularVenta as apiAnularVenta,
} from "../api/facturas.js";
import { money } from "../domain/money.js";
import useAsync from "../hooks/useAsync.js";
import useSession from "../hooks/useSession.js";
import FacturaDetalleModal from "../components/facturas/FacturaDetalleModal.jsx";
import AnularVentaModal from "../components/facturas/AnularVentaModal.jsx";

const POR_PAGINA = 20;

export default function AdminFacturas() {
  const navigate = useNavigate();
  const { token, rol, logout } = useSession();

  const hoy = useMemo(() => new Date(), []);
  const treintaDias = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const [fechaDesde, setFechaDesde] = useState(
    treintaDias.toISOString().split("T")[0],
  );
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split("T")[0]);
  const [idEmpleado, setIdEmpleado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  const empleadosQ = useAsync(() => getEmpleados({ limit: 100 }), {
    immediate: false,
  });
  const empleados = useMemo(
    () => (Array.isArray(empleadosQ.data?.data) ? empleadosQ.data.data : []),
    [empleadosQ.data],
  );

  const facturasQ = useAsync(
    async () => {
      setPagina(1);
      return getFacturas({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        id_empleado: idEmpleado,
      });
    },
    { immediate: false },
  );
  const facturas = useMemo(
    () => (Array.isArray(facturasQ.data) ? facturasQ.data : []),
    [facturasQ.data],
  );
  const cargando = facturasQ.loading;

  const cargarEmpleados = empleadosQ.run;
  const cargarFacturas = facturasQ.run;

  const [showModal, setShowModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [loadDetalle, setLoadDetalle] = useState(false);

  // Anular venta
  const [modalAnular, setModalAnular] = useState(null); // factura
  const [motivoAnular, setMotivoAnular] = useState("");
  const [msgAnular, setMsgAnular] = useState({ text: "", type: "" });
  const [loadAnular, setLoadAnular] = useState(false);

  // Auth (redundante con ProtectedRoute, se mantiene por seguridad)
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (rol !== "admin" && rol !== "cajero")
      navigate("/facturas", { replace: true });
  }, [token, rol, navigate]);

  const Navbar = rol === "cajero" ? CajeroNavbar : AdminNavbar;

  async function verDetalle(id) {
    setLoadDetalle(true);
    setShowModal(true);
    setDetalle(null);
    try {
      setDetalle(await getFacturaDetalle(id));
    } catch {
      setDetalle(null);
      setShowModal(false);
      alert("Error al cargar el detalle");
    } finally {
      setLoadDetalle(false);
    }
  }

  function pedirAnular(factura) {
    setModalAnular(factura);
    setMotivoAnular("");
    setMsgAnular({ text: "", type: "" });
  }

  async function anularVenta() {
    if (!motivoAnular.trim()) {
      setMsgAnular({
        text: "Debes indicar un motivo para anular la venta.",
        type: "danger",
      });
      return;
    }
    setLoadAnular(true);
    setMsgAnular({ text: "", type: "" });
    try {
      await apiAnularVenta(modalAnular.id_factura, motivoAnular.trim());
      setModalAnular(null);
      await cargarFacturas();
    } catch (e) {
      setMsgAnular({
        text: e.message || "Error al anular la venta",
        type: "danger",
      });
    } finally {
      setLoadAnular(false);
    }
  }

  useEffect(() => {
    cargarEmpleados();
    cargarFacturas();
    // Carga inicial única; los filtros se aplican con el botón "Aplicar".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtro local por búsqueda ─────────────────────────────
  const facturasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return facturas;
    return facturas.filter(
      (f) =>
        String(f.id_factura).includes(q) ||
        (f.empleado_nombres || "").toLowerCase().includes(q) ||
        (f.observaciones || "").toLowerCase().includes(q),
    );
  }, [facturas, busqueda]);

  // Reset página al buscar
  useEffect(() => {
    setPagina(1);
  }, [busqueda]);

  // ── Paginación ────────────────────────────────────────────
  const totalPaginas = Math.max(
    1,
    Math.ceil(facturasFiltradas.length / POR_PAGINA),
  );
  const facturasPagina = facturasFiltradas.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  );

  // ── KPIs ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const validas = facturasFiltradas.filter((f) => !f.anulada);
    const anuladas = facturasFiltradas.filter((f) => f.anulada);
    const totalNeto = validas.reduce(
      (s, f) => s + Number(f.total_neto || 0),
      0,
    );
    const n = validas.length;
    return {
      n,
      totalNeto,
      anuladas: anuladas.length,
      promedio: n ? totalNeto / n : 0,
    };
  }, [facturasFiltradas]);

  // ── Exportar CSV ──────────────────────────────────────────
  function exportCSV() {
    if (!facturasFiltradas.length) return;
    const cols = [
      ["ID", (f) => f.id_factura],
      ["Fecha/Hora", (f) => new Date(f.fecha_hora).toLocaleString("es-CO")],
      ["Empleado", (f) => f.empleado_nombres ?? ""],
      ["Cliente", (f) => f.observaciones ?? ""],
      ["Total", (f) => f.total_neto ?? 0],
      ["Estado", (f) => (f.anulada ? "Anulada" : "Válida")],
      ["Motivo anulación", (f) => f.motivo_anulacion ?? ""],
    ];
    const csv = [
      cols.map(([h]) => h).join(","),
      ...facturasFiltradas.map((f) =>
        cols
          .map(([, fn]) => `"${String(fn(f)).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(
        new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
      ),
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
          <p className="lead mb-0">
            Consulta y gestiona todas las ventas del sistema.
          </p>
        </section>

        {/* KPIs */}
        <div className="row g-3 mb-4">
          {[
            { label: "Total ventas", val: kpis.n, fmt: (v) => v },
            { label: "Ingresos netos", val: kpis.totalNeto, fmt: money },
            { label: "Promedio x venta", val: kpis.promedio, fmt: money },
            { label: "Anuladas", val: kpis.anuladas, fmt: (v) => v },
          ].map((s) => (
            <div className="col-6 col-md-3" key={s.label}>
              <div className="card card-soft h-100 text-center p-3">
                <div className="text-muted small">{s.label}</div>
                <div className="h4 fw-bold text-gradient mt-1">
                  {s.fmt(s.val)}
                </div>
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
                <input
                  type="date"
                  className="form-control"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Hasta</label>
                <input
                  type="date"
                  className="form-control"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              {rol === "admin" && (
                <div className="col-md-3">
                  <label className="form-label">Empleado</label>
                  <select
                    className="form-select"
                    value={idEmpleado}
                    onChange={(e) => setIdEmpleado(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {empleados.map((e) => (
                      <option key={e.id_empleado} value={e.id_empleado}>
                        {e.nombres} {e.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div
                className={`col-md-${rol === "admin" ? 3 : 6} d-flex align-items-end gap-2`}
              >
                <button
                  className="btn btn-brand flex-grow-1"
                  onClick={cargarFacturas}
                >
                  Aplicar
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={cargarFacturas}
                  title="Actualizar"
                >
                  🔄
                </button>
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
                <span className="badge bg-info">
                  {facturasFiltradas.length}
                </span>
              </div>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <input
                  className="form-control form-control-sm"
                  style={{ width: 220 }}
                  placeholder="Buscar por ID, empleado, cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <button
                  className="btn btn-sm btn-outline-brand"
                  onClick={exportCSV}
                  disabled={!facturasFiltradas.length}
                  title="Exportar CSV"
                >
                  ⬇️ CSV
                </button>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: 520 }}>
              <table className="table table-hover align-middle">
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "var(--white, #fff)",
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th>#</th>
                    <th>Fecha/Hora</th>
                    <th>Empleado</th>
                    <th>Cliente</th>
                    <th className="text-end">Total</th>
                    <th className="text-center">Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7}>
                          <div className="placeholder-wave">
                            <span className="placeholder col-12" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : facturasPagina.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        {busqueda
                          ? `Sin resultados para "${busqueda}"`
                          : "Sin ventas en el período seleccionado"}
                      </td>
                    </tr>
                  ) : (
                    facturasPagina.map((f) => (
                      <tr
                        key={f.id_factura}
                        className={
                          f.anulada ? "table-secondary opacity-75" : ""
                        }
                      >
                        <td className="fw-semibold text-muted small">
                          #{f.id_factura}
                        </td>
                        <td className="small">
                          {new Date(f.fecha_hora).toLocaleString("es-CO")}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {f.empleado_nombres || "N/A"}
                          </span>
                        </td>
                        <td className="small text-muted">
                          {f.observaciones || "—"}
                        </td>
                        <td
                          className={`text-end fw-bold ${f.anulada ? "text-muted text-decoration-line-through" : "text-success"}`}
                        >
                          {money(f.total_neto)}
                        </td>
                        <td className="text-center">
                          {f.anulada ? (
                            <span
                              className="badge bg-danger"
                              title={f.motivo_anulacion || ""}
                            >
                              Anulada
                            </span>
                          ) : (
                            <span className="badge bg-success">Válida</span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end">
                            <button
                              className="btn btn-sm btn-outline-brand"
                              onClick={() => verDetalle(f.id_factura)}
                            >
                              Ver
                            </button>
                            {rol === "admin" && !f.anulada && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => pedirAnular(f)}
                              >
                                Anular
                              </button>
                            )}
                          </div>
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
                  Página {pagina} de {totalPaginas} · {facturasFiltradas.length}{" "}
                  registros
                </small>
                <div className="d-flex gap-1">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPagina(1)}
                    disabled={pagina === 1}
                  >
                    «
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    const start = Math.max(
                      1,
                      Math.min(pagina - 2, totalPaginas - 4),
                    );
                    const p = start + i;
                    return p <= totalPaginas ? (
                      <button
                        key={p}
                        className={`btn btn-sm ${p === pagina ? "btn-brand" : "btn-outline-secondary"}`}
                        onClick={() => setPagina(p)}
                      >
                        {p}
                      </button>
                    ) : null;
                  })}
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setPagina((p) => Math.min(totalPaginas, p + 1))
                    }
                    disabled={pagina === totalPaginas}
                  >
                    ›
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPagina(totalPaginas)}
                    disabled={pagina === totalPaginas}
                  >
                    »
                  </button>
                </div>
              </div>
            )}

            <p className="small text-muted mt-2 mb-0">
              Mostrando {facturasPagina.length} de {facturasFiltradas.length}{" "}
              ventas
            </p>
          </div>
        </div>
      </main>

      <FacturaDetalleModal
        open={showModal}
        detalle={detalle}
        loading={loadDetalle}
        onClose={() => setShowModal(false)}
      />

      <AnularVentaModal
        factura={modalAnular}
        motivo={motivoAnular}
        setMotivo={setMotivoAnular}
        msg={msgAnular}
        loading={loadAnular}
        onConfirm={anularVenta}
        onCancel={() => setModalAnular(null)}
      />

      <Footer />
    </>
  );
}
