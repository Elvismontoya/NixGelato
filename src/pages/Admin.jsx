import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import Footer from "../components/Footer.jsx";
import ModalConfirmar from "../components/ModalConfirmar.jsx";
import { useFormValidation, FieldError } from "../hooks/useFormValidation.jsx";
import { apiDelete } from "../api/client.js";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

export default function Admin() {
  const navigate = useNavigate();

  // =========================
  // Auth check
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) { navigate("/login", { replace: true }); return; }
    if (rol !== "admin") { navigate("/pedido", { replace: true }); return; }
  }, [navigate]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  }

  // =========================
  // Estados principales
  // =========================
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [msgTabla, setMsgTabla] = useState("Cargando productos...");
  const [activeTab, setActiveTab] = useState("dashboard");

  // =========================
  // Estado Dashboard
  // =========================
  const [dash, setDash]           = useState(null);
  const [dashLoading, setDashLoading] = useState(true);

  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  // =========================
  // Estados UI: filtros/orden
  // =========================
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [onlyToppings, setOnlyToppings] = useState(false);
  const [sortBy, setSortBy] = useState("nombre-asc");

  // =========================
  // Estados formulario productos
  // =========================
  const [formProducto, setFormProducto] = useState({
    id: "",
    nombre: "",
    precio: "",
    stock: "",
    img: "",
    permiteToppings: "1",
    id_categoria: ""
  });
  const [msgFormProducto, setMsgFormProducto] = useState({ text: "", type: "muted" });
  const editModeProducto = useMemo(() => !!formProducto.id, [formProducto.id]);

  // =========================
  // Estados formulario categorías
  // =========================
  const [formCategoria, setFormCategoria] = useState({
    id: "",
    nombre: "",
    descripcion: ""
  });
  const [msgFormCategoria, setMsgFormCategoria] = useState({ text: "", type: "muted" });
  const editModeCategoria = useMemo(() => !!formCategoria.id, [formCategoria.id]);

  // =========================
  // Modal confirmar eliminar
  // =========================
  const [modalEliminar, setModalEliminar] = useState(null)
  const [loadingEliminar, setLoadingEliminar] = useState(false)

  // =========================
  // Historial de ventas por producto
  // =========================
  const [modalHistorial, setModalHistorial] = useState(null) // { id, nombre }
  const [historialData,  setHistorialData]  = useState(null)
  const [historialLoad,  setHistorialLoad]  = useState(false)

  async function verHistorialVentas(producto) {
    setModalHistorial({ id: producto.id, nombre: producto.nombre })
    setHistorialData(null)
    setHistorialLoad(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/productos/${producto.id}/ventas`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error()
      setHistorialData(await res.json())
    } catch {
      setHistorialData({ error: true })
    } finally {
      setHistorialLoad(false)
    }
  }

  // =========================
  // Validación formularios
  // =========================
  const validacionProducto = useFormValidation({
    nombre:  { required: 'El nombre es obligatorio', minLength: 2 },
    precio:  {
      required: 'El precio es obligatorio',
      validate: (v) => Number(v) >= 0 || 'El precio no puede ser negativo',
    },
    stock:   {
      required: 'El stock es obligatorio',
      validate: (v) => Number(v) >= 0 || 'El stock no puede ser negativo',
    },
  })

  const validacionCategoria = useFormValidation({
    nombre: { required: 'El nombre es obligatorio', minLength: 2 },
  })

  // =========================
  // Cargar datos
  // =========================
  async function cargarProductos() {
    setLoadingProductos(true);
    setMsgTabla("Cargando productos...");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/productos`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setMsgTabla("No autorizado o error cargando.");
        setProductos([]);
        return;
      }
      const data = await res.json();

      // Transformar: backend -> frontend (aplanar categorías con sus productos)
      const productosTransformados = transformarProductos(data);
      setProductos(Array.isArray(productosTransformados) ? productosTransformados : []);
      setMsgTabla(
        Array.isArray(productosTransformados) && productosTransformados.length
          ? `Total productos: ${productosTransformados.length}`
          : "Sin productos en catálogo."
      );
    } catch (e) {
      console.error("Error cargando productos", e);
      setMsgTabla("Error cargando productos.");
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }

  function transformarProductos(data) {
    if (!Array.isArray(data)) return [];
    return data.flatMap(categoria =>
      categoria.productos?.map(producto => ({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        stock: producto.stock,
        img: producto.img,
        permiteToppings: producto.permiteToppings,
        id_categoria: producto.id_categoria,
        categoria: categoria.nombre
      })) || []
    );
  }

  async function cargarCategorias() {
    setLoadingCategorias(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categorias`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : []);
      } else {
        setCategorias([]);
      }
    } catch (e) {
      console.error("Error cargando categorías", e);
      setCategorias([]);
    } finally {
      setLoadingCategorias(false);
    }
  }

  async function cargarDashboard() {
    setDashLoading(true);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      const [resHoy, resStock, resCaja, resSemana] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/auditoria/ingresos-hoy`,
          { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/inventario/alertas`,
          { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/caja/estado`,
          { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/facturas/ingresos-por-dia?fecha_desde=${
          (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split("T")[0]; })()
        }&fecha_hasta=${hoy}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);

      const ingresosHoy   = resHoy.ok   ? await resHoy.json()    : null;
      const stockBajo     = resStock.ok ? await resStock.json()   : [];
      const estadoCaja    = resCaja.ok  ? await resCaja.json()    : null;
      const semana        = resSemana.ok? await resSemana.json()  : [];

      setDash({ ingresosHoy, stockBajo: Array.isArray(stockBajo) ? stockBajo : [], estadoCaja, semana: Array.isArray(semana) ? semana : [] });
    } catch (err) {
      console.error("Dashboard:", err);
    } finally {
      setDashLoading(false);
    }
  }

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
    cargarDashboard();
  }, []);

  // =========================
  // Métricas (hero stats)
  // =========================
  const totalProductos = productos.length;
  const totalCategorias = categorias.length;
  const bajoStock = useMemo(() => productos.filter(p => Number(p.stock) <= 10).length, [productos]);

  // =========================
  // Filtro + orden de productos
  // =========================
  const productosFiltrados = useMemo(() => {
    let list = [...productos];

    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(p =>
        p.nombre?.toLowerCase().includes(s) ||
        p.categoria?.toLowerCase().includes(s) ||
        String(p.id)?.includes(s)
      );
    }

    if (filterCat) list = list.filter(p => String(p.id_categoria) === String(filterCat));
    if (onlyToppings) list = list.filter(p => !!p.permiteToppings);

    const [key, dir] = sortBy.split("-");
    list.sort((a, b) => {
      const asc = dir === "asc" ? 1 : -1;
      if (key === "nombre") return a.nombre.localeCompare(b.nombre) * asc;
      if (key === "precio") return (Number(a.precio) - Number(b.precio)) * asc;
      if (key === "stock") return (Number(a.stock) - Number(b.stock)) * asc;
      return 0;
    });

    return list;
  }, [productos, q, filterCat, onlyToppings, sortBy]);

  // =========================
  // Handlers Productos
  // =========================
  function onChangeProducto(e) {
    const { name, value } = e.target;
    setFormProducto((f) => ({ ...f, [name]: value }));
  }

  function startEditarProducto(p) {
    setFormProducto({
      id: p.id,
      nombre: p.nombre || "",
      precio: String(p.precio ?? ""),
      stock: String(p.stock ?? ""),
      img: p.img || "",
      permiteToppings: p.permiteToppings ? "1" : "0",
      id_categoria: p.id_categoria || ""
    });
    setMsgFormProducto({ text: "", type: "muted" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFormProducto() {
    setFormProducto({
      id: "",
      nombre: "",
      precio: "",
      stock: "",
      img: "",
      permiteToppings: "1",
      id_categoria: ""
    });
    setMsgFormProducto({ text: "", type: "muted" });
  }

  async function onSubmitProducto(e) {
    e.preventDefault();

    const body = {
      nombre: formProducto.nombre.trim(),
      precio: Number(formProducto.precio),
      stock:  Number(formProducto.stock),
      img:    formProducto.img.trim(),
      permiteToppings: formProducto.permiteToppings === "1" ? 1 : 0,
      id_categoria: formProducto.id_categoria || null
    };

    // Validación visual
    if (!validacionProducto.validar({ nombre: body.nombre, precio: body.precio, stock: body.stock })) return;

    setMsgFormProducto({ text: "Guardando...", type: "muted" });

    try {
      let res;
      if (editModeProducto) {
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/productos/${formProducto.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/productos`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token"); localStorage.removeItem("rol");
        navigate("/login", { replace: true }); return;
      }
      if (!res.ok) {
        setMsgFormProducto({ text: data.message || "Error al guardar.", type: "danger" }); return;
      }
      setMsgFormProducto({ text: "Guardado correctamente.", type: "success" });
      validacionProducto.limpiar();
      resetFormProducto();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      setMsgFormProducto({ text: "Error al conectar con el servidor.", type: "danger" });
    }
  }

  function pedirEliminarProducto(producto) {
    setModalEliminar({
      tipo: 'producto',
      id: producto.id,
      titulo: '¿Eliminar producto?',
      mensaje: 'Esta acción es permanente. El producto será eliminado del catálogo.',
      detalle: `"${producto.nombre}"`,
    })
  }

  async function eliminarProducto(id) {
    setLoadingEliminar(true)
    try {
      await apiDelete(`${import.meta.env.VITE_API_URL}/api/productos/${id}`)
      setModalEliminar(null)
      await cargarProductos()
    } catch (e) {
      console.error(e)
      setMsgFormProducto({ text: e.message || "No se pudo eliminar", type: "danger" })
      setModalEliminar(null)
    } finally {
      setLoadingEliminar(false)
    }
  }

  // =========================
  // Handlers Categorías
  // =========================
  function onChangeCategoria(e) {
    const { name, value } = e.target;
    setFormCategoria((f) => ({ ...f, [name]: value }));
  }

  function startEditarCategoria(cat) {
    setFormCategoria({
      id: cat.id_categoria,
      nombre: cat.nombre || "",
      descripcion: cat.descripcion || ""
    });
    setMsgFormCategoria({ text: "", type: "muted" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFormCategoria() {
    setFormCategoria({
      id: "",
      nombre: "",
      descripcion: ""
    });
    setMsgFormCategoria({ text: "", type: "muted" });
  }

  async function onSubmitCategoria(e) {
    e.preventDefault();

    const body = {
      nombre:      formCategoria.nombre.trim(),
      descripcion: formCategoria.descripcion.trim()
    };

    if (!validacionCategoria.validar({ nombre: body.nombre })) return;

    setMsgFormCategoria({ text: "Guardando...", type: "muted" });

    try {
      let res;
      if (editModeCategoria) {
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/categorias/${formCategoria.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/categorias`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token"); localStorage.removeItem("rol");
        navigate("/login", { replace: true }); return;
      }
      if (!res.ok) {
        setMsgFormCategoria({ text: data.message || "Error al guardar.", type: "danger" }); return;
      }
      setMsgFormCategoria({ text: "Categoría guardada correctamente.", type: "success" });
      validacionCategoria.limpiar();
      resetFormCategoria();
      await cargarCategorias();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      setMsgFormCategoria({ text: "Error al conectar con el servidor.", type: "danger" });
    }
  }

  function pedirEliminarCategoria(cat) {
    setModalEliminar({
      tipo: 'categoria',
      id: cat.id_categoria,
      titulo: '¿Eliminar categoría?',
      mensaje: 'Los productos asociados quedarán sin categoría.',
      detalle: `"${cat.nombre}"`,
    })
  }

  async function eliminarCategoria(id) {
    setLoadingEliminar(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categorias/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsgFormCategoria({ text: data.message || "No se pudo eliminar", type: "danger" });
        setModalEliminar(null); return;
      }
      setModalEliminar(null);
      await cargarCategorias();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      setMsgFormCategoria({ text: "Error al conectar con el servidor.", type: "danger" });
      setModalEliminar(null);
    } finally {
      setLoadingEliminar(false)
    }
  }

  // =========================
  // Render
  // =========================
  return (
    <>
      <AdminNavbar onLogout={logout} />

      <main className="container my-4">
        {/* Hero con métricas */}
        <section className="hero mb-4 text-center fade-in">
          <div className="hero-content">
            <h1 className="display-6 fw-bold mb-2">Panel administrador</h1>
            <p className="lead mb-4">Gestiona productos y categorías del catálogo.</p>
          </div>
        </section>

        <div className="mb-4 row g-3 justify-content-center stagger-children">
          <div className="col-12 col-md-4">
            <div className="card-soft text-center p-3">
              <div className="text-muted">Productos</div>
              <div className="h3 fw-bold text-gradient mt-1">{totalProductos}</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card-soft text-center p-3">
              <div className="text-muted">Categorías</div>
              <div className="h3 fw-bold text-gradient mt-1">{totalCategorias}</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card-soft text-center p-3">
              <div className="text-muted">Bajo stock (≤10)</div>
              <div className="h3 fw-bold text-gradient mt-1">{bajoStock}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card card-soft mb-4">
          <div className="card-body">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  📊 Dashboard
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "productos" ? "active" : ""}`}
                  onClick={() => setActiveTab("productos")}
                >
                  Gestión de Productos
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "categorias" ? "active" : ""}`}
                  onClick={() => setActiveTab("categorias")}
                >
                  Gestión de Categorías
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="fade-in">
            {dashLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-brand" role="status" />
                <p className="mt-3 text-muted">Cargando dashboard...</p>
              </div>
            ) : (
              <>
                {/* Fila 1: Métricas del día */}
                <div className="row g-3 mb-4">
                  {[
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
                      value: dash?.stockBajo?.length ?? 0,
                      sub: "Productos bajo mínimo",
                      color: dash?.stockBajo?.length > 0 ? "text-danger" : "text-success",
                    },
                    {
                      icon: "💰",
                      label: "Caja hoy",
                      value: dash?.estadoCaja?.apertura
                        ? money(dash.estadoCaja.apertura.monto_apertura)
                        : "Sin apertura",
                      sub: dash?.estadoCaja?.apertura?.estado === "abierta"
                        ? "🟢 Abierta"
                        : dash?.estadoCaja?.apertura?.estado === "cerrada"
                        ? "🔴 Cerrada"
                        : "⚪ Sin registrar",
                      color: "text-gradient",
                    },
                  ].map((s) => (
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
                          <button className="btn btn-sm btn-outline-secondary" onClick={cargarDashboard}>🔄</button>
                        </div>
                        {dash?.semana?.length === 0 ? (
                          <div className="text-center text-muted py-4">Sin ventas en los últimos 7 días</div>
                        ) : (() => {
                          const maxVal = Math.max(...(dash?.semana ?? []).map(d => d.ingresos_totales), 1);
                          const dias = [...(dash?.semana ?? [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                          return (
                            <div className="d-flex align-items-end gap-2" style={{ height: 180 }}>
                              {dias.map((d, i) => {
                                const pct = Math.max((d.ingresos_totales / maxVal) * 100, 4);
                                const fecha = new Date(d.fecha + "T12:00:00");
                                const esHoy = d.fecha === new Date().toISOString().split("T")[0];
                                return (
                                  <div key={i} className="d-flex flex-column align-items-center flex-grow-1" style={{ height: "100%" }}>
                                    <div className="small text-muted mb-1" style={{ fontSize: "0.65rem" }}>
                                      {money(d.ingresos_totales).replace("COP", "").trim()}
                                    </div>
                                    <div className="w-100 rounded-top position-relative" style={{
                                      height: `${pct}%`,
                                      background: esHoy
                                        ? "linear-gradient(180deg, var(--sky, #6cd2f7), var(--aqua, #91eed3))"
                                        : "rgba(108, 210, 247, 0.35)",
                                      minHeight: 8,
                                      transition: "height .4s ease",
                                    }} title={`${d.total_ventas} ventas · ${money(d.ingresos_totales)}`} />
                                    <div className="small text-muted mt-1" style={{ fontSize: "0.65rem" }}>
                                      {fecha.toLocaleDateString("es-CO", { weekday: "short" })}
                                    </div>
                                    <div style={{ fontSize: "0.6rem", color: esHoy ? "var(--sky)" : "transparent", fontWeight: 700 }}>●</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Totales semana */}
                        {dash?.semana?.length > 0 && (
                          <div className="row g-2 mt-3 pt-3 border-top">
                            <div className="col-4 text-center">
                              <div className="small text-muted">Total semana</div>
                              <div className="fw-bold text-success">
                                {money(dash.semana.reduce((s, d) => s + Number(d.ingresos_totales), 0))}
                              </div>
                            </div>
                            <div className="col-4 text-center">
                              <div className="small text-muted">Ventas semana</div>
                              <div className="fw-bold">{dash.semana.reduce((s, d) => s + Number(d.total_ventas), 0)}</div>
                            </div>
                            <div className="col-4 text-center">
                              <div className="small text-muted">Mejor día</div>
                              <div className="fw-bold text-brand" style={{ fontSize: "0.8rem" }}>
                                {(() => {
                                  const mejor = [...dash.semana].sort((a, b) => b.ingresos_totales - a.ingresos_totales)[0];
                                  return mejor ? new Date(mejor.fecha + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric" }) : "—";
                                })()}
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
                          <span className={`badge ${dash?.stockBajo?.length > 0 ? "bg-danger" : "bg-success"}`}>
                            {dash?.stockBajo?.length ?? 0}
                          </span>
                        </div>
                        {(dash?.stockBajo ?? []).length === 0 ? (
                          <div className="text-center py-4">
                            <div style={{ fontSize: "2rem" }}>✅</div>
                            <p className="text-success small mt-2 mb-0">Todos los productos tienen stock suficiente</p>
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
                                {dash.stockBajo.map((p) => (
                                  <tr key={p.id_producto}>
                                    <td className="small fw-semibold">{p.nombre_producto}</td>
                                    <td className="text-center">
                                      <span className={`badge ${p.stock_actual === 0 ? "bg-danger" : "bg-warning text-dark"}`}>
                                        {p.stock_actual}
                                      </span>
                                    </td>
                                    <td className="text-center text-muted small">{p.stock_minimo}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <button
                          className="btn btn-sm btn-outline-brand w-100 mt-2"
                          onClick={() => window.location.href = "/admin/inventario"}
                        >
                          Ver inventario completo →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* CONTENIDO: PRODUCTOS */}
        {activeTab === "productos" && (
          <div className="row g-4 fade-in">
            {/* Formulario */}
            <div className="col-lg-4">
              <div className="card card-soft h-100">
                <div className="card-body">
                  <h5 className="mb-3">
                    {editModeProducto ? "Editar producto" : "Nuevo producto"}
                  </h5>

                  <form onSubmit={onSubmitProducto} className="stagger-children">
                    <input type="hidden" name="id" value={formProducto.id} />

                    <div className="mb-3">
                      <label className="form-label">Nombre del producto</label>
                      <input
                        type="text"
                        className={`form-control ${validacionProducto.errores.nombre ? 'is-invalid' : ''}`}
                        name="nombre"
                        value={formProducto.nombre}
                        onChange={(e) => { onChangeProducto(e); validacionProducto.limpiarCampo('nombre') }}
                        required
                      />
                      <FieldError errores={validacionProducto.errores} campo="nombre" />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Categoría</label>
                      <select
                        className="form-select"
                        name="id_categoria"
                        value={formProducto.id_categoria}
                        onChange={onChangeProducto}
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map((cat) => (
                          <option key={cat.id_categoria} value={cat.id_categoria}>
                            {cat.nombre}
                          </option>
                        ))}
                      </select>
                      <div className="form-text">
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0"
                          onClick={() => setActiveTab("categorias")}
                        >
                          Gestionar categorías
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Precio base (COP)</label>
                      <input
                        type="number"
                        className={`form-control ${validacionProducto.errores.precio ? 'is-invalid' : ''}`}
                        name="precio"
                        min="0"
                        step="100"
                        value={formProducto.precio}
                        onChange={(e) => { onChangeProducto(e); validacionProducto.limpiarCampo('precio') }}
                        required
                      />
                      <FieldError errores={validacionProducto.errores} campo="precio" />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Stock inicial / actual</label>
                      <input
                        type="number"
                        className={`form-control ${validacionProducto.errores.stock ? 'is-invalid' : ''}`}
                        name="stock"
                        min="0"
                        step="1"
                        value={formProducto.stock}
                        onChange={(e) => { onChangeProducto(e); validacionProducto.limpiarCampo('stock') }}
                        required
                      />
                      <FieldError errores={validacionProducto.errores} campo="stock" />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">URL Imagen</label>
                      <input
                        type="url"
                        className="form-control"
                        name="img"
                        placeholder="https://ejemplo.com/helado.jpg"
                        value={formProducto.img}
                        onChange={onChangeProducto}
                      />
                      <div className="form-text">
                        Usa una URL de imagen válida o déjalo vacío
                      </div>
                      {formProducto.img.trim() && (
                        <div className="mt-2 d-flex align-items-center gap-3 p-2 rounded" style={{ background: "var(--bg-soft, #f8f9fa)" }}>
                          <img
                            src={formProducto.img.trim()}
                            alt="Vista previa"
                            style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }}
                            onLoad={(e) => {
                              e.target.style.display = "block";
                              e.target.nextSibling.style.display = "none";
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "block";
                            }}
                          />
                          <span className="small text-danger" style={{ display: "none" }}>
                            ⚠️ No se pudo cargar la imagen desde esta URL
                          </span>
                          <span className="small text-muted">Vista previa</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">¿Permite toppings?</label>
                      <select
                        className="form-select"
                        name="permiteToppings"
                        value={formProducto.permiteToppings}
                        onChange={onChangeProducto}
                      >
                        <option value="1">Sí</option>
                        <option value="0">No</option>
                      </select>
                    </div>

                    <div className="d-grid gap-2">
                      <button type="submit" className="btn btn-brand">
                        {editModeProducto ? "Actualizar producto" : "Guardar producto"}
                      </button>
                      {editModeProducto && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={resetFormProducto}
                        >
                          Cancelar edición
                        </button>
                      )}
                    </div>

                    {msgFormProducto.text && (
                      <p className={`small mt-3 mb-0 text-${msgFormProducto.type}`}>
                        {msgFormProducto.text}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* Lado derecho: Toolbar + Tabla */}
            <div className="col-lg-8">
              <div className="card card-soft h-100">
                <div className="card-body">
                  {/* Toolbar de filtros */}
                  <div className="row g-2 align-items-end mb-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Buscar</label>
                      <input
                        className="form-control"
                        placeholder="Nombre, categoría o ID…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label">Categoría</label>
                      <select
                        className="form-select"
                        value={filterCat}
                        onChange={(e) => setFilterCat(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {categorias.map(c => (
                          <option key={c.id_categoria} value={c.id_categoria}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label">Ordenar por</label>
                      <select
                        className="form-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="nombre-asc">Nombre (A–Z)</option>
                        <option value="nombre-desc">Nombre (Z–A)</option>
                        <option value="precio-asc">Precio (menor)</option>
                        <option value="precio-desc">Precio (mayor)</option>
                        <option value="stock-asc">Stock (menor)</option>
                        <option value="stock-desc">Stock (mayor)</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-2 d-flex gap-2">
                      <div className="form-check mt-auto">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="onlyToppings"
                          checked={onlyToppings}
                          onChange={(e) => setOnlyToppings(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="onlyToppings">
                          Solo toppings
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Tabla */}
                  <div className="table-responsive" style={{ maxHeight: 520 }}>
                    <table className="table align-middle">
                      <thead style={{ position: "sticky", top: 0, background: "var(--white)", zIndex: 1 }}>
                        <tr>
                          <th>Producto</th>
                          <th className="text-center">Categoría</th>
                          <th className="text-center">Precio</th>
                          <th className="text-center">Stock</th>
                          <th className="text-center">Toppings</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="stagger-children">
                        {loadingProductos ? (
                          // Skeleton simple
                          Array.from({ length: 6 }).map((_, i) => (
                            <tr key={`sk-${i}`}>
                              <td colSpan={6}>
                                <div className="placeholder-wave">
                                  <span className="placeholder col-12" />
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : productosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-5">
                              <div className="text-muted mb-2">No se encontraron productos</div>
                              <button className="btn btn-outline-brand" onClick={() => { setQ(""); setFilterCat(""); setOnlyToppings(false); setSortBy("nombre-asc"); }}>
                                Limpiar filtros
                              </button>
                            </td>
                          </tr>
                        ) : (
                          productosFiltrados.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  {p.img ? (
                                    <img
                                      src={p.img}
                                      alt={p.nombre}
                                      style={{
                                        width: 48,
                                        height: 48,
                                        objectFit: "cover",
                                        borderRadius: 8,
                                        border: "1px solid #ddd",
                                      }}
                                      onError={(e) => {
                                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNGOEY5RkEiLz48cGF0aCBkPSJNMjQgMzJMMjAgMjhIMTZMMTIgMzJMMTYgMzZIMjBMMjQgMzJaIiBmaWxsPSIjRDZENkQ2Ii8+PC9zdmc+';
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 8,
                                        border: "1px dashed #ddd",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 10,
                                        color: "#888",
                                        backgroundColor: '#f8f9fa'
                                      }}
                                    >
                                      sin img
                                    </div>
                                  )}
                                  <div>
                                    <div className="fw-semibold">{p.nombre}</div>
                                    <div className="small text-muted">ID: {p.id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-light text-dark">
                                  {p.categoria || "Sin categoría"}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className="price-badge">{money(p.precio)}</span>
                              </td>
                              <td className="text-center">
                                <span className={`badge ${
                                  Number(p.stock) > 10 ? 'bg-success' :
                                  Number(p.stock) > 0 ? 'bg-warning text-dark' : 'bg-danger'
                                }`}>
                                  {p.stock}
                                </span>
                              </td>
                              <td className="text-center">
                                {p.permiteToppings ? (
                                  <span className="badge text-bg-success">Sí</span>
                                ) : (
                                  <span className="badge text-bg-secondary">No</span>
                                )}
                              </td>
                              <td className="text-end">
                                <div className="d-flex justify-content-end gap-2 flex-nowrap">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary btn-table-action"
                                    onClick={() => verHistorialVentas(p)}
                                    title="Historial de ventas"
                                  >
                                    📊
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-brand btn-table-action"
                                    onClick={() => startEditarProducto(p)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger btn-table-action"
                                    onClick={() => pedirEliminarProducto(p)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="small text-muted mt-2 mb-0">{msgTabla}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO: CATEGORÍAS */}
        {activeTab === "categorias" && (
          <div className="row g-4 fade-in">
            {/* Formulario */}
            <div className="col-lg-4">
              <div className="card card-soft h-100">
                <div className="card-body">
                  <h5 className="mb-3">
                    {editModeCategoria ? "Editar categoría" : "Nueva categoría"}
                  </h5>

                  <form onSubmit={onSubmitCategoria} className="stagger-children">
                    <input type="hidden" name="id" value={formCategoria.id} />

                    <div className="mb-3">
                      <label className="form-label">Nombre de la categoría</label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombre"
                        value={formCategoria.nombre}
                        onChange={onChangeCategoria}
                        placeholder="Ej: Helados, Postres, Bebidas..."
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Descripción (opcional)</label>
                      <textarea
                        className="form-control"
                        name="descripcion"
                        rows="3"
                        value={formCategoria.descripcion}
                        onChange={onChangeCategoria}
                        placeholder="Descripción de la categoría..."
                      />
                    </div>

                    <div className="d-grid gap-2">
                      <button type="submit" className="btn btn-brand">
                        {editModeCategoria ? "Actualizar categoría" : "Crear categoría"}
                      </button>
                      {editModeCategoria && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={resetFormCategoria}
                        >
                          Cancelar edición
                        </button>
                      )}
                    </div>

                    {msgFormCategoria.text && (
                      <p className={`small mt-3 mb-0 text-${msgFormCategoria.type}`}>
                        {msgFormCategoria.text}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* Lista */}
            <div className="col-lg-8">
              <div className="card card-soft">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Categorías existentes</h5>
                    <small className="text-muted">Organiza tus productos por categorías</small>
                  </div>

                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Descripción</th>
                          <th className="text-center">Productos</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="stagger-children">
                        {loadingCategorias ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <tr key={`skc-${i}`}>
                              <td colSpan={4}>
                                <div className="placeholder-wave">
                                  <span className="placeholder col-12" />
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : categorias.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-4">
                              No hay categorías creadas.
                            </td>
                          </tr>
                        ) : (
                          categorias.map((cat) => (
                            <tr key={cat.id_categoria}>
                              <td>
                                <div className="fw-semibold">{cat.nombre}</div>
                              </td>
                              <td>
                                <div className="text-muted small">
                                  {cat.descripcion || "Sin descripción"}
                                </div>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-info">
                                  {productos.filter(p => String(p.id_categoria) === String(cat.id_categoria)).length}
                                </span>
                              </td>
                              <td className="text-end">
                                <div className="d-flex justify-content-end gap-2 flex-nowrap">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-brand btn-table-action"
                                    onClick={() => startEditarCategoria(cat)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger btn-table-action"
                                    onClick={() => pedirEliminarCategoria(cat)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="alert alert-info mt-3">
                    <small>
                      <strong>Nota:</strong> Al eliminar una categoría, los productos asociados
                      quedarán sin categoría pero no se eliminarán.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Modal historial de ventas */}
      {modalHistorial && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1050, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => setModalHistorial(null)} />
          <div style={{ position: "fixed", inset: 0, zIndex: 1055, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", pointerEvents: "none" }}>
            <div className="card border-0 shadow-lg" style={{ width: "100%", maxWidth: 600, borderRadius: "1.25rem", pointerEvents: "all", maxHeight: "85vh", overflowY: "auto" }}>
              <div className="card-header border-0 pt-4 pb-3 px-4" style={{ background: "linear-gradient(135deg, var(--sky, #6cd2f7), var(--aqua, #91eed3))" }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">📊 Historial de ventas — {modalHistorial.nombre}</h5>
                  <button className="btn-close" onClick={() => setModalHistorial(null)} />
                </div>
              </div>
              <div className="card-body p-4">
                {historialLoad ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-brand" role="status" />
                  </div>
                ) : historialData?.error ? (
                  <p className="text-muted text-center py-4">No se pudo cargar el historial</p>
                ) : (
                  <>
                    {/* Resumen */}
                    <div className="row g-3 mb-4">
                      {[
                        { label: "Unidades vendidas", val: historialData?.resumen?.total_unidades ?? 0 },
                        { label: "Ventas registradas", val: historialData?.resumen?.total_ventas ?? 0 },
                        { label: "Ingresos generados", val: money(historialData?.resumen?.total_ingresos ?? 0) },
                      ].map((s) => (
                        <div className="col-4" key={s.label}>
                          <div className="card card-soft text-center p-3">
                            <div className="text-muted small">{s.label}</div>
                            <div className="h5 fw-bold text-gradient mt-1">{s.val}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h6 className="fw-bold mb-2">Ventas por día</h6>
                    {(historialData?.por_dia ?? []).length === 0 ? (
                      <p className="text-muted text-center py-3">Este producto aún no tiene ventas registradas</p>
                    ) : (
                      <div className="table-responsive" style={{ maxHeight: 280 }}>
                        <table className="table table-sm align-middle">
                          <thead style={{ position: "sticky", top: 0, background: "var(--white, #fff)" }}>
                            <tr>
                              <th>Fecha</th>
                              <th className="text-center">Unidades</th>
                              <th className="text-center">Ventas</th>
                              <th className="text-end">Ingresos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historialData.por_dia.map((d) => (
                              <tr key={d.fecha}>
                                <td className="small fw-semibold">
                                  {new Date(d.fecha + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                                </td>
                                <td className="text-center">
                                  <span className="badge bg-info">{d.unidades}</span>
                                </td>
                                <td className="text-center text-muted small">{d.ventas}</td>
                                <td className="text-end fw-semibold text-success">{money(d.ingresos)}</td>
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
                <button className="btn btn-secondary w-100" onClick={() => setModalHistorial(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </>
      )}

      <ModalConfirmar
        config={modalEliminar ? { ...modalEliminar, loading: loadingEliminar } : null}
        onConfirm={() => {
          if (modalEliminar?.tipo === 'producto') eliminarProducto(modalEliminar.id)
          if (modalEliminar?.tipo === 'categoria') eliminarCategoria(modalEliminar.id)
        }}
        onCancel={() => !loadingEliminar && setModalEliminar(null)}
      />
      <Footer />
    </>
  );
}