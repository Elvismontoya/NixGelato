import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import Footer from "../components/Footer.jsx";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });
const getToken = () => localStorage.getItem("token") || "";

export default function Inventario() {
  const navigate = useNavigate();

  const [inventario,  setInventario]  = useState([]);
  const [alertas,     setAlertas]     = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [editandoId,  setEditandoId]  = useState(null);
  const [formEdicion, setFormEdicion] = useState({ stock_actual: "", stock_minimo: "" });
  const [guardando,   setGuardando]   = useState(false);
  const [msgEdicion,  setMsgEdicion]  = useState({ id: null, text: "", type: "" });
  const [busqueda,    setBusqueda]    = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol   = localStorage.getItem("rol");
    if (!token) { navigate("/login", { replace: true }); return; }
    if (rol !== "admin") { navigate("/pedido", { replace: true }); }
  }, [navigate]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  }

  async function cargarInventario() {
    setCargando(true);
    try {
      const [resInv, resAlt] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/inventario`,
          { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/inventario/alertas`,
          { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (!resInv.ok) throw new Error();
      const [dataInv, dataAlt] = await Promise.all([resInv.json(), resAlt.ok ? resAlt.json() : []]);
      setInventario(Array.isArray(dataInv) ? dataInv : []);
      setAlertas(Array.isArray(dataAlt)    ? dataAlt : []);
    } catch {
      setInventario([]);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarInventario(); }, []);

  // ── Filtros ───────────────────────────────────────────────
  const inventarioFiltrado = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return inventario.filter((item) => {
      if (filtroEstado && item.estado !== filtroEstado) return false;
      if (q && !(item.nombre_producto || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [inventario, busqueda, filtroEstado]);

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    inventario.length,
    normales: inventario.filter(i => i.estado === "normal").length,
    bajos:    inventario.filter(i => i.estado === "bajo").length,
    agotados: inventario.filter(i => i.estado === "agotado").length,
  }), [inventario]);

  // ── Edición ───────────────────────────────────────────────
  function iniciarEdicion(item) {
    setEditandoId(item.id_producto);
    setFormEdicion({
      stock_actual: String(item.stock_actual),
      stock_minimo: String(item.stock_minimo),
    });
    setMsgEdicion({ id: null, text: "", type: "" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setFormEdicion({ stock_actual: "", stock_minimo: "" });
    setMsgEdicion({ id: null, text: "", type: "" });
  }

  async function guardarEdicion(id) {
    const stockActual = parseInt(formEdicion.stock_actual);
    const stockMinimo = parseInt(formEdicion.stock_minimo);

    if (isNaN(stockActual) || isNaN(stockMinimo) || stockActual < 0 || stockMinimo < 0) {
      setMsgEdicion({ id, text: "Los valores deben ser números >= 0", type: "danger" });
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/inventario/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ stock_actual: stockActual, stock_minimo: stockMinimo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al actualizar");

      setMsgEdicion({ id, text: "✅ Stock actualizado", type: "success" });
      setTimeout(() => {
        cancelarEdicion();
        cargarInventario();
      }, 800);
    } catch (err) {
      setMsgEdicion({ id, text: err.message || "Error al actualizar", type: "danger" });
    } finally {
      setGuardando(false);
    }
  }

  // ── Exportar CSV ──────────────────────────────────────────
  function exportCSV() {
    if (!inventarioFiltrado.length) return;
    const cols = [
      ["ID",         (i) => i.id_producto],
      ["Producto",   (i) => i.nombre_producto],
      ["Categoría",  (i) => i.categoria    ?? ""],
      ["Precio",     (i) => i.precio       ?? 0],
      ["Stock",      (i) => i.stock_actual],
      ["Mínimo",     (i) => i.stock_minimo],
      ["Estado",     (i) => i.estado],
      ["Actualizado",(i) => i.ultima_actualizacion
        ? new Date(i.ultima_actualizacion).toLocaleDateString("es-CO") : ""],
    ];
    const csv = [
      cols.map(([h]) => h).join(","),
      ...inventarioFiltrado.map((item) =>
        cols.map(([, fn]) => `"${String(fn(item)).replaceAll('"', '""')}"`).join(",")
      ),
    ].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })),
      download: `inventario_${new Date().toISOString().split("T")[0]}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (cargando) return (
    <>
      <AdminNavbar onLogout={logout} />
      <main className="container my-4">
        <div className="text-center py-5">
          <div className="spinner-border text-brand" role="status" />
          <p className="mt-3">Cargando inventario...</p>
        </div>
      </main>
    </>
  );

  return (
    <>
      <AdminNavbar onLogout={logout} />

      <main className="container my-4">
        <section className="hero mb-4 text-center fade-in">
          <h1 className="display-6 fw-bold mb-2">Gestión de Inventario</h1>
          <p className="lead mb-0">Control y seguimiento de stock de productos.</p>
        </section>

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="alert alert-warning d-flex justify-content-between align-items-center mb-4">
            <div>
              <strong>⚠️ {alertas.length} producto(s)</strong> con stock por debajo del mínimo.
            </div>
            <button className="btn btn-sm btn-warning"
              onClick={() => setFiltroEstado(filtroEstado === "bajo" ? "" : "bajo")}>
              {filtroEstado === "bajo" ? "Ver todos" : "Ver solo bajos"}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="row g-3 mb-4">
          {[
            { label: "Total",    val: stats.total,    color: "text-brand"   },
            { label: "Normal",   val: stats.normales, color: "text-success" },
            { label: "Bajo",     val: stats.bajos,    color: "text-warning" },
            { label: "Agotado",  val: stats.agotados, color: "text-danger"  },
          ].map((s) => (
            <div className="col-6 col-md-3" key={s.label}>
              <div className="card card-soft text-center p-3 h-100">
                <div className="text-muted small">{s.label}</div>
                <div className={`h3 fw-bold mt-1 ${s.color}`}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="card card-soft">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0">Inventario completo</h5>
                <span className="badge bg-info">{inventarioFiltrado.length}</span>
              </div>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                <input
                  className="form-control form-control-sm"
                  style={{ width: 200 }}
                  placeholder="Buscar producto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <select className="form-select form-select-sm" style={{ width: 140 }}
                  value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="normal">Normal</option>
                  <option value="bajo">Stock bajo</option>
                  <option value="agotado">Agotado</option>
                </select>
                <button className="btn btn-sm btn-outline-brand" onClick={exportCSV}
                  disabled={!inventarioFiltrado.length}>⬇️ CSV</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={cargarInventario}>🔄</button>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: 580 }}>
              <table className="table align-middle table-hover">
                <thead style={{ position: "sticky", top: 0, background: "var(--white, #fff)", zIndex: 1 }}>
                  <tr>
                    <th>Producto</th>
                    <th className="text-center">Categoría</th>
                    <th className="text-end">Precio</th>
                    <th className="text-center">Stock actual</th>
                    <th className="text-center">Stock mínimo</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Actualizado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioFiltrado.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted py-5">
                      {busqueda || filtroEstado ? "Sin resultados con ese filtro" : "Sin productos en inventario"}
                    </td></tr>
                  ) : (
                    inventarioFiltrado.map((item) => {
                      const editando = editandoId === item.id_producto;
                      const rowClass = item.estado === "agotado" ? "table-danger"
                        : item.estado === "bajo" ? "table-warning" : "";
                      return (
                        <tr key={item.id_producto} className={rowClass}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {item.img ? (
                                <img src={item.img} alt={item.nombre_producto}
                                  style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 6 }}
                                  onError={(e) => { e.target.style.display = "none" }} />
                              ) : (
                                <div style={{ width: 38, height: 38, borderRadius: 6, background: "#f0f0f0",
                                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
                              )}
                              <div>
                                <div className="fw-semibold small">{item.nombre_producto}</div>
                                <div className="small text-muted">ID: {item.id_producto}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border">{item.categoria || "—"}</span>
                          </td>
                          <td className="text-end small">{money(item.precio)}</td>

                          {/* Stock actual editable */}
                          <td className="text-center">
                            {editando ? (
                              <input type="number" className="form-control form-control-sm text-center"
                                style={{ width: 80, margin: "0 auto" }}
                                value={formEdicion.stock_actual} min="0"
                                onChange={(e) => setFormEdicion(p => ({ ...p, stock_actual: e.target.value }))} />
                            ) : (
                              <span className={`fw-bold ${item.stock_actual <= 0 ? "text-danger" : item.stock_actual <= item.stock_minimo ? "text-warning" : "text-success"}`}>
                                {item.stock_actual}
                              </span>
                            )}
                          </td>

                          {/* Stock mínimo editable */}
                          <td className="text-center">
                            {editando ? (
                              <input type="number" className="form-control form-control-sm text-center"
                                style={{ width: 80, margin: "0 auto" }}
                                value={formEdicion.stock_minimo} min="0"
                                onChange={(e) => setFormEdicion(p => ({ ...p, stock_minimo: e.target.value }))} />
                            ) : (
                              <span className="text-muted">{item.stock_minimo}</span>
                            )}
                          </td>

                          <td className="text-center">
                            {item.estado === "agotado" && <span className="badge bg-danger">Agotado</span>}
                            {item.estado === "bajo"    && <span className="badge bg-warning text-dark">Bajo</span>}
                            {item.estado === "normal"  && <span className="badge bg-success">Normal</span>}
                          </td>

                          <td className="text-center small text-muted">
                            {item.ultima_actualizacion
                              ? new Date(item.ultima_actualizacion).toLocaleDateString("es-CO")
                              : "—"}
                          </td>

                          <td className="text-end">
                            {editando ? (
                              <div>
                                <div className="d-flex gap-1 justify-content-end mb-1">
                                  <button className="btn btn-sm btn-success px-3"
                                    onClick={() => guardarEdicion(item.id_producto)}
                                    disabled={guardando}>
                                    {guardando ? <span className="spinner-border spinner-border-sm" /> : "✓"}
                                  </button>
                                  <button className="btn btn-sm btn-outline-secondary"
                                    onClick={cancelarEdicion} disabled={guardando}>✕</button>
                                </div>
                                {msgEdicion.id === item.id_producto && msgEdicion.text && (
                                  <div className={`small text-${msgEdicion.type} text-end`}>{msgEdicion.text}</div>
                                )}
                                {msgEdicion.id === null && msgEdicion.text && (
                                  <div className={`small text-${msgEdicion.type} text-end`}>{msgEdicion.text}</div>
                                )}
                              </div>
                            ) : (
                              <button className="btn btn-sm btn-outline-brand"
                                onClick={() => iniciarEdicion(item)}>
                                Ajustar stock
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Leyenda */}
            <div className="d-flex gap-4 flex-wrap mt-3 pt-3 border-top">
              {[
                { color: "bg-success", label: "Normal: stock por encima del mínimo" },
                { color: "bg-warning", label: "Bajo: stock igual o menor al mínimo" },
                { color: "bg-danger",  label: "Agotado: sin stock disponible" },
              ].map((l) => (
                <div key={l.label} className="d-flex align-items-center gap-2">
                  <div className={`${l.color} rounded`} style={{ width: 12, height: 12 }} />
                  <small className="text-muted">{l.label}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}