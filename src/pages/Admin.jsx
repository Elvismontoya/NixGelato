import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar.jsx";
import Footer from "../components/Footer.jsx";
import ModalConfirmar from "../components/ModalConfirmar.jsx";
import HistorialVentasModal from "../components/admin/HistorialVentasModal.jsx";
import DashboardTab from "../components/admin/DashboardTab.jsx";
import CategoriasTab from "../components/admin/CategoriasTab.jsx";
import NegocioTab from "../components/admin/NegocioTab.jsx";
import ProductoForm from "../components/admin/ProductoForm.jsx";
import ProductosTabla from "../components/admin/ProductosTabla.jsx";
import { useFormValidation } from "../hooks/useFormValidation.jsx";
import FieldError from "../components/FieldError.jsx";
import { getProductos, crearProducto, actualizarProducto, eliminarProducto as apiEliminarProducto, getVentasProducto } from "../api/productos.js";
import { getCategorias, crearCategoria, actualizarCategoria, eliminarCategoria as apiEliminarCategoria } from "../api/categorias.js";
import { getAlertasStock } from "../api/inventario.js";
import { getEstadoCaja } from "../api/caja.js";
import { getIngresosPorDia } from "../api/facturas.js";
import { getIngresosHoy } from "../api/auditoria.js";
import useSession from "../hooks/useSession.js";
import useAsync from "../hooks/useAsync.js";

// Aplana la respuesta agrupada del backend a filas planas de producto.
function transformarProductos(data) {
  if (!Array.isArray(data)) return [];
  return data.flatMap((categoria) =>
    categoria.productos?.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      tarifaIva: producto.tarifaIva ?? 19,
      stock: producto.stock,
      img: producto.img,
      permiteToppings: producto.permiteToppings,
      id_categoria: producto.id_categoria,
      categoria: categoria.nombre,
    })) || []
  );
}

async function cargarDashboardData() {
  const hoy = new Date().toISOString().split("T")[0];
  const desde = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split("T")[0]; })();
  const [ingresosHoy, stockBajo, estadoCaja, semana] = await Promise.all([
    getIngresosHoy().catch(() => null),
    getAlertasStock().catch(() => []),
    getEstadoCaja().catch(() => null),
    getIngresosPorDia({ fecha_desde: desde, fecha_hasta: hoy }).catch(() => []),
  ]);
  return {
    ingresosHoy,
    stockBajo: Array.isArray(stockBajo) ? stockBajo : [],
    estadoCaja,
    semana: Array.isArray(semana) ? semana : [],
  };
}

export default function Admin() {
  const navigate = useNavigate();
  const { token, isAdmin, logout } = useSession();

  // Auth check (redundante con ProtectedRoute, se mantiene por seguridad)
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
    else if (!isAdmin) navigate("/pedido", { replace: true });
  }, [token, isAdmin, navigate]);

  const [activeTab, setActiveTab] = useState("dashboard");

  // ── Datos (useAsync) ──────────────────────────────────────
  const productosQ  = useAsync(() => getProductos().then(transformarProductos), { immediate: false });
  const categoriasQ = useAsync(() => getCategorias(), { immediate: false });
  const dashQ       = useAsync(cargarDashboardData, { immediate: false });

  const productos  = useMemo(() => Array.isArray(productosQ.data) ? productosQ.data : [], [productosQ.data]);
  const categorias = useMemo(() => Array.isArray(categoriasQ.data) ? categoriasQ.data : [], [categoriasQ.data]);
  const dash = dashQ.data;
  const dashLoading = dashQ.loading;
  const loadingProductos = productosQ.loading;
  const loadingCategorias = categoriasQ.loading;

  const cargarProductos  = productosQ.run;
  const cargarCategorias = categoriasQ.run;
  const cargarDashboard  = dashQ.run;

  const msgTabla = loadingProductos
    ? "Cargando productos..."
    : productosQ.error
    ? "Error cargando productos."
    : productos.length
    ? `Total productos: ${productos.length}`
    : "Sin productos en catálogo.";

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
    cargarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    tarifa_iva: "19",
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
      setHistorialData(await getVentasProducto(producto.id))
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
      tarifa_iva: String(p.tarifaIva ?? 19),
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
      tarifa_iva: "19",
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
      tarifa_iva: Number(formProducto.tarifa_iva),
      stock:  Number(formProducto.stock),
      img:    formProducto.img.trim(),
      permiteToppings: formProducto.permiteToppings === "1" ? 1 : 0,
      id_categoria: formProducto.id_categoria || null
    };

    // Validación visual
    if (!validacionProducto.validar({ nombre: body.nombre, precio: body.precio, stock: body.stock })) return;

    setMsgFormProducto({ text: "Guardando...", type: "muted" });

    try {
      if (editModeProducto) {
        await actualizarProducto(formProducto.id, body);
      } else {
        await crearProducto(body);
      }
      setMsgFormProducto({ text: "Guardado correctamente.", type: "success" });
      validacionProducto.limpiar();
      resetFormProducto();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      setMsgFormProducto({ text: e.message || "Error al guardar.", type: "danger" });
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
      await apiEliminarProducto(id)
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
      if (editModeCategoria) {
        await actualizarCategoria(formCategoria.id, body);
      } else {
        await crearCategoria(body);
      }
      setMsgFormCategoria({ text: "Categoría guardada correctamente.", type: "success" });
      validacionCategoria.limpiar();
      resetFormCategoria();
      await cargarCategorias();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      setMsgFormCategoria({ text: e.message || "Error al guardar.", type: "danger" });
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
      await apiEliminarCategoria(id);
      setModalEliminar(null);
      await cargarCategorias();
      await cargarProductos();
    } catch (e) {
      console.error(e);
      setMsgFormCategoria({ text: e.message || "No se pudo eliminar", type: "danger" });
      setModalEliminar(null);
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
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "negocio" ? "active" : ""}`}
                  onClick={() => setActiveTab("negocio")}
                >
                  🏪 Negocio
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <DashboardTab dash={dash} loading={dashLoading} onReload={cargarDashboard} />
        )}

        {/* CONTENIDO: PRODUCTOS */}
        {activeTab === "productos" && (
          <div className="row g-4 fade-in">
            <ProductoForm
              form={formProducto}
              onChange={onChangeProducto}
              validacion={validacionProducto}
              editMode={editModeProducto}
              onReset={resetFormProducto}
              onSubmit={onSubmitProducto}
              msg={msgFormProducto}
              categorias={categorias}
              onGestionarCategorias={() => setActiveTab("categorias")}
            />
            <ProductosTabla
              q={q} setQ={setQ}
              filterCat={filterCat} setFilterCat={setFilterCat}
              sortBy={sortBy} setSortBy={setSortBy}
              onlyToppings={onlyToppings} setOnlyToppings={setOnlyToppings}
              categorias={categorias}
              loading={loadingProductos}
              productos={productosFiltrados}
              msgTabla={msgTabla}
              onLimpiarFiltros={() => { setQ(""); setFilterCat(""); setOnlyToppings(false); setSortBy("nombre-asc"); }}
              onHistorial={verHistorialVentas}
              onEditar={startEditarProducto}
              onEliminar={pedirEliminarProducto}
            />
          </div>
        )}

        {/* CONTENIDO: CATEGORÍAS */}
        {activeTab === "categorias" && (
          <CategoriasTab
            form={formCategoria}
            onChange={onChangeCategoria}
            onSubmit={onSubmitCategoria}
            onReset={resetFormCategoria}
            editMode={editModeCategoria}
            msg={msgFormCategoria}
            categorias={categorias}
            productos={productos}
            loading={loadingCategorias}
            onStartEditar={startEditarCategoria}
            onPedirEliminar={pedirEliminarCategoria}
          />
        )}

        {/* CONTENIDO: NEGOCIO */}
        {activeTab === "negocio" && <NegocioTab />}

      </main>
      <HistorialVentasModal
        modal={modalHistorial}
        data={historialData}
        loading={historialLoad}
        onClose={() => setModalHistorial(null)}
      />

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