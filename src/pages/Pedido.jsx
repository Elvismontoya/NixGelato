import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ModalConfirmar from "../components/ModalConfirmar.jsx";
import Ticket from "../components/Ticket.jsx";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

const getProductoId    = (p) => p.id ?? p.id_producto;
const getProductoNombre= (p) => p.nombre ?? p.nombre_producto;
const getProductoPrecio= (p) => Number(p.precio ?? p.precio_venta_unitario ?? 0);
const getProductoStock = (p) => p.stock ?? p.stock_actual ?? 0;
const getProductoPermiteToppings = (p) => p.permiteToppings ?? p.permite_toppings ?? false;
const getToppingNombre = (t) => t.nombre ?? t.nombre_topping;
const getToppingPrecio = (t) => Number(t.precio_adicional ?? t.precio ?? 0);

// Billetes comunes en Colombia
const BILLETES = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

export default function Pedido() {
  const navigate = useNavigate();

  const [categorias,    setCategorias]    = useState([]);
  const [toppings,      setToppings]      = useState([]);
  const [pedido,        setPedido]        = useState([]);
  const [cliente,       setCliente]       = useState("");
  const [pago,          setPago]          = useState(0);
  const [metodoPago,    setMetodoPago]    = useState("");
  const [metodosPago,   setMetodosPago]   = useState([]);
  const [navbarFixed,   setNavbarFixed]   = useState(false);
  const [cargando,      setCargando]      = useState(true);
  const [cobrandoLoad,  setCobrandoLoad]  = useState(false);

  // Flujo de selección
  const [productoSeleccionado,   setProductoSeleccionado]   = useState(null);
  const [toppingsSeleccionados,  setToppingsSeleccionados]  = useState([]);

  // Buscador
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [modalVaciar,  setModalVaciar]   = useState(false);
  const [modalExito,   setModalExito]    = useState(null); // { id_factura, total }
  const [ventaParaTicket, setVentaParaTicket] = useState(null); // datos congelados para el ticket

  // ── Navbar fijo ────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setNavbarFixed(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Auth ───────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  // Obtener nombre del empleado actual para el ticket (siempre actualizado)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.nombres) {
          localStorage.setItem("nombreEmpleado", `${data.nombres} ${data.apellidos || ""}`.trim());
        } else {
          localStorage.removeItem("nombreEmpleado");
        }
      })
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("nombreEmpleado");
    navigate("/login", { replace: true });
  }

  // ── Cargar datos ───────────────────────────────────────────
  async function cargarDatos() {
    setCargando(true);
    try {
      const [resP, resT] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/productos`,
          { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/toppings`,
          { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (!resP.ok || !resT.ok) throw new Error("Error cargando datos");
      setCategorias(await resP.json());
      setToppings(await resT.json());
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }

  async function cargarMetodosPago() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/facturas/metodos-pago`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setMetodosPago(Array.isArray(data)
          ? data.map((m) => ({ id: m.id_metodo, nombre_metodo: m.nombre_metodo }))
          : []);
      }
    } catch {
      setMetodosPago([
        { id: 1, nombre_metodo: "Efectivo" },
        { id: 2, nombre_metodo: "Transferencia" },
      ]);
    }
  }

  useEffect(() => {
    cargarDatos();
    cargarMetodosPago();
  }, []);

  // ── Buscador ───────────────────────────────────────────────
  const todosLosProductos = useMemo(() =>
    categorias.flatMap((cat) =>
      (cat.productos ?? []).map((p) => ({ ...p, _catNombre: cat.nombre }))
    ), [categorias]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return [];
    return todosLosProductos.filter((p) =>
      getProductoNombre(p).toLowerCase().includes(q)
    );
  }, [busqueda, todosLosProductos]);

  // ── Selección de producto ──────────────────────────────────
  function seleccionarProducto(producto) {
    if (getProductoStock(producto) <= 0) return;
    setBusqueda("");

    // Si NO tiene toppings → agregar directo al pedido sin pantalla intermedia
    if (!getProductoPermiteToppings(producto)) {
      agregarDirecto(producto);
      return;
    }
    // Si tiene toppings → ir a pantalla de personalización
    setProductoSeleccionado(producto);
    setToppingsSeleccionados([]);
  }

  function agregarDirecto(producto) {
    const precio = getProductoPrecio(producto);
    setPedido((prev) => {
      // Si ya existe el mismo producto sin toppings → aumentar cantidad
      const idx = prev.findIndex(
        (i) => getProductoId(i.producto) === getProductoId(producto) && i.toppings.length === 0
      );
      if (idx !== -1) {
        return prev.map((i, index) =>
          index === idx
            ? { ...i, cantidad: i.cantidad + 1, subtotal: i.precioUnitario * (i.cantidad + 1) }
            : i
        );
      }
      return [...prev, {
        id: `${getProductoId(producto)}-${Date.now()}`,
        producto,
        toppings: [],
        cantidad: 1,
        precioUnitario: precio,
        subtotal: precio,
      }];
    });
  }

  function toggleTopping(topping) {
    setToppingsSeleccionados((prev) => {
      const existe = prev.find((t) => t.id_topping === topping.id_topping);
      return existe
        ? prev.filter((t) => t.id_topping !== topping.id_topping)
        : [...prev, topping];
    });
  }

  const precioFinal = useMemo(() => {
    if (!productoSeleccionado) return 0;
    return Math.round(
      getProductoPrecio(productoSeleccionado) +
      toppingsSeleccionados.reduce((s, t) => s + getToppingPrecio(t), 0)
    );
  }, [productoSeleccionado, toppingsSeleccionados]);

  function agregarAlPedido() {
    if (!productoSeleccionado) return;
    setPedido((prev) => [...prev, {
      id: `${getProductoId(productoSeleccionado)}-${Date.now()}`,
      producto: productoSeleccionado,
      toppings: [...toppingsSeleccionados],
      cantidad: 1,
      precioUnitario: precioFinal,
      subtotal: precioFinal,
    }]);
    setProductoSeleccionado(null);
    setToppingsSeleccionados([]);
  }

  // ── Pedido ─────────────────────────────────────────────────
  function quitarProducto(id) {
    setPedido((prev) => prev.filter((i) => i.id !== id));
  }

  function cambiarCantidad(id, val) {
    const n = Math.max(1, Number(val));
    setPedido((prev) =>
      prev.map((i) => i.id === id ? { ...i, cantidad: n, subtotal: i.precioUnitario * n } : i)
    );
  }

  // ── Cálculos ───────────────────────────────────────────────
  const subtotal              = pedido.reduce((s, i) => s + i.subtotal, 0);
  const total                 = subtotal;
  const cambio                = Math.max(pago - total, 0);

  // Si el método es transferencia, sincronizar pago con total automáticamente
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (metodoPago && metodoPago !== "Efectivo") {
      setPago(total);
    }
  }, [total, metodoPago]);

  // ── Atajos de teclado ────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      const escribiendo = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Esc: cerrar modales, salir de personalización, o vaciar pedido
      if (e.key === "Escape") {
        if (modalExito) { setModalExito(null); setVentaParaTicket(null); return; }
        if (modalVaciar) { setModalVaciar(false); return; }
        if (productoSeleccionado) { setProductoSeleccionado(null); setToppingsSeleccionados([]); return; }
        if (pedido.length > 0) { setModalVaciar(true); return; }
        return;
      }

      // Si hay un modal abierto, no procesar más atajos
      if (modalExito || modalVaciar || productoSeleccionado) return;

      // Enter: cobrar si es posible
      if (e.key === "Enter" && !escribiendo) {
        if (pedido.length > 0 && metodoPago && pago >= total && !cobrandoLoad) {
          e.preventDefault();
          cobrar();
        }
        return;
      }

      // Números 1-8: seleccionar billete rápido (solo si NO está escribiendo y método es Efectivo)
      if (!escribiendo && metodoPago === "Efectivo" && /^[1-8]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        const billetesDisponibles = BILLETES.filter((b) => b >= Math.min(total, 1000));
        if (billetesDisponibles[idx] !== undefined) {
          e.preventDefault();
          setPago(billetesDisponibles[idx]);
        }
        return;
      }

      // Tecla "0": pago exacto
      if (!escribiendo && metodoPago === "Efectivo" && e.key === "0" && total > 0) {
        e.preventDefault();
        setPago(total);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalExito, modalVaciar, productoSeleccionado, pedido, metodoPago, pago, total, cobrandoLoad]);

  // ── Cobrar ─────────────────────────────────────────────────
  async function cobrar() {
    if (!pedido.length || !metodoPago) return;
    setCobrandoLoad(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/facturas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          cliente,
          subtotal,
          total,
          metodo_pago: metodoPago,
          productos: pedido.map((item) => ({
            id: getProductoId(item.producto),
            cantidad: item.cantidad,
            precio: item.precioUnitario,
            toppings: item.toppings.map((t) => t.id_topping),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al registrar");

      // Congelar datos para el ticket (antes de vaciar el pedido)
      const empleadoNombre = localStorage.getItem("nombreEmpleado") || "";
      setVentaParaTicket({
        id_factura: data.id_factura,
        fecha: new Date().toLocaleString("es-CO"),
        cliente,
        empleado: empleadoNombre,
        items: pedido.map((item) => ({
          nombre: getProductoNombre(item.producto),
          cantidad: item.cantidad,
          subtotal: item.subtotal,
          toppings: item.toppings.map(getToppingNombre),
        })),
        total,
        metodoPago,
        pago,
        cambio,
      });

      // Mostrar modal de éxito
      setModalExito({ id_factura: data.id_factura, total });

      // Reset
      setPedido([]);
      setCliente("");
      setPago(0);
      setMetodoPago("");

      // Refrescar stock
      await cargarDatos();
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setCobrandoLoad(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────
  if (cargando) {
    return (
      <>
        <nav className="navbar navbar-expand-lg border-bottom">
          <div className="container">
            <span className="navbar-brand fw-bold">🍨 NixGelato</span>
          </div>
        </nav>
        <main className="container my-4">
          <div className="text-center py-5">
            <div className="spinner-border text-brand" role="status" />
            <p className="mt-3 text-muted">Cargando sistema de caja...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {/* NAVBAR */}
      <nav className={`navbar navbar-expand-lg border-bottom ${navbarFixed ? "fixed-nav" : ""}`}>
        <div className="container-fluid px-4">
          <Link className="navbar-brand fw-bold" to="/">🍨 NixGelato</Link>
          <div className="d-flex gap-2 align-items-center ms-auto">
            <span className="badge bg-success d-none d-sm-inline">{pedido.length} items</span>
            <span className="badge bg-brand d-none d-sm-inline">{money(total)}</span>
            <Link className="btn btn-sm btn-outline-brand" to="/facturas">Ventas</Link>
            <button className="btn btn-sm btn-outline-secondary" onClick={logout}>Salir</button>
          </div>
        </div>
      </nav>
      {navbarFixed && <div style={{ height: 70 }} />}

      <main className="container-fluid py-3 px-4">
        <div className="row g-4">

          {/* ── PANEL IZQUIERDO: Productos ── */}
          <div className="col-xl-8 col-lg-7">
            <div className="card card-soft shadow-sm">
              <div className="card-body p-4">

                {/* Título + buscador */}
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h4 className="fw-bold mb-0">
                    {productoSeleccionado ? `🎯 ${getProductoNombre(productoSeleccionado)}` : "🍦 Menú"}
                  </h4>
                  {!productoSeleccionado && (
                    <div style={{ maxWidth: 320, width: "100%" }}>
                      <div className="input-group">
                        <span className="input-group-text">🔍</span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Buscar producto..."
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          autoComplete="off"
                        />
                        {busqueda && (
                          <button className="btn btn-outline-secondary" onClick={() => setBusqueda("")}>✕</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Resultados del buscador */}
                {busqueda && !productoSeleccionado && (
                  <div className="mb-4">
                    {productosFiltrados.length === 0 ? (
                      <p className="text-muted text-center py-3">Sin resultados para "{busqueda}"</p>
                    ) : (
                      <div className="row g-2">
                        {productosFiltrados.map((p) => {
                          const stock = getProductoStock(p);
                          return (
                            <div className="col-md-4 col-sm-6" key={getProductoId(p)}>
                              <div
                                className={`card h-100 border-0 shadow-sm ${stock <= 0 ? "opacity-50" : "hover-lift cursor-pointer"}`}
                                onClick={() => stock > 0 && seleccionarProducto(p)}
                              >
                                <div className="card-body p-3 d-flex align-items-center gap-3">
                                  <img
                                    src={p.img || ""}
                                    alt={getProductoNombre(p)}
                                    style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }}
                                    onError={(e) => { e.target.style.display = "none" }}
                                  />
                                  <div className="flex-grow-1 min-w-0">
                                    <div className="fw-semibold small text-truncate">{getProductoNombre(p)}</div>
                                    <div className="small text-muted">{p._catNombre}</div>
                                    <div className="fw-bold text-success small">{money(getProductoPrecio(p))}</div>
                                  </div>
                                  <span className={`badge ${stock > 0 ? "bg-success" : "bg-danger"}`}>
                                    {stock <= 0 ? "Agotado" : stock}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Vista de categorías */}
                {!productoSeleccionado && !busqueda && (
                  <div>
                    {categorias.map((cat, idx) => (
                      <section key={cat.id ?? cat.id_categoria} className="mb-5">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <h5 className="fw-bold mb-0">{cat.nombre}</h5>
                          <span className="badge bg-light text-dark border">{cat.productos?.length ?? 0}</span>
                        </div>
                        <div className="row g-3">
                          {(cat.productos ?? []).map((p) => {
                            const stock = getProductoStock(p);
                            const sinStock = stock <= 0;
                            return (
                              <div className="col-xxl-3 col-lg-4 col-md-6" key={getProductoId(p)}>
                                <div
                                  className={`product-card card border-0 h-100 ${sinStock ? "opacity-50" : "hover-lift cursor-pointer"}`}
                                  onClick={() => !sinStock && seleccionarProducto(p)}
                                >
                                  <div className="product-image-container position-relative">
                                    <img
                                      src={p.img || ""}
                                      alt={getProductoNombre(p)}
                                      className="product-image"
                                      onError={(e) => {
                                        e.target.parentElement.style.background = "#f8f9fa";
                                        e.target.style.display = "none";
                                      }}
                                    />
                                    <div className="product-overlay">
                                      <span className={`badge ${sinStock ? "bg-danger" : "bg-success"}`}>
                                        {sinStock ? "Agotado" : `Stock: ${stock}`}
                                      </span>
                                    </div>
                                    {getProductoPermiteToppings(p) && (
                                      <div className="product-badge-top">
                                        <span className="badge bg-info">+Toppings</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="card-body p-3">
                                    <h6 className="fw-semibold mb-1" style={{ fontSize: "0.88rem" }}>{getProductoNombre(p)}</h6>
                                    <div className="fw-bold text-success">{money(getProductoPrecio(p))}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {idx < categorias.length - 1 && <hr className="my-4" />}
                      </section>
                    ))}
                  </div>
                )}

                {/* Vista personalización (toppings) */}
                {productoSeleccionado && (
                  <div>
                    <button className="btn btn-outline-secondary mb-4" onClick={() => { setProductoSeleccionado(null); setToppingsSeleccionados([]); }}>
                      ← Volver al menú
                    </button>

                    <div className="row g-4">
                      <div className="col-lg-8">
                        <h6 className="fw-bold mb-3">🎯 Elige tus toppings</h6>
                        {toppings.length === 0 ? (
                          <p className="text-muted">No hay toppings disponibles.</p>
                        ) : (
                          <div className="row g-2">
                            {toppings.map((t) => {
                              const activo = !!toppingsSeleccionados.find((s) => s.id_topping === t.id_topping);
                              return (
                                <div className="col-md-4 col-6" key={t.id_topping}>
                                  <div
                                    className={`topping-card card text-center cursor-pointer ${activo ? "topping-active" : ""}`}
                                    onClick={() => toggleTopping(t)}
                                  >
                                    <div className="card-body p-3">
                                      <div style={{ fontSize: "1.5rem" }}>{activo ? "✅" : "➕"}</div>
                                      <div className="fw-semibold small mt-1">{getToppingNombre(t)}</div>
                                      <div className={`small fw-bold ${activo ? "text-white" : "text-brand"}`}>+{money(getToppingPrecio(t))}</div>
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
                            <span className="fw-semibold">{money(getProductoPrecio(productoSeleccionado))}</span>
                          </div>
                          {toppingsSeleccionados.map((t) => (
                            <div key={t.id_topping} className="d-flex justify-content-between mb-1">
                              <span className="text-muted small">{getToppingNombre(t)}</span>
                              <span className="small">+{money(getToppingPrecio(t))}</span>
                            </div>
                          ))}
                          <div className="d-flex justify-content-between border-top pt-2 mt-2">
                            <span className="fw-bold">Total</span>
                            <span className="fw-bold text-success fs-5">{money(precioFinal)}</span>
                          </div>
                          <button className="btn btn-brand w-100 mt-3 btn-lg" onClick={agregarAlPedido}>
                            Agregar al pedido
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── PANEL DERECHO: Pedido ── */}
          <div className="col-xl-4 col-lg-5">
            <div className="card card-soft shadow-sm sticky-sidebar">
              <div className="card-header bg-white border-0 pt-4 pb-2 px-4">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="fw-bold mb-0">🛒 Pedido</h4>
                  {pedido.length > 0 && (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setModalVaciar(true)}>
                      Vaciar
                    </button>
                  )}
                </div>
              </div>

              <div className="card-body p-0">
                {/* Items */}
                <div className="px-4 py-2 border-bottom" style={{ maxHeight: 300, overflowY: "auto" }}>
                  {pedido.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <div style={{ fontSize: "2rem" }}>📝</div>
                      <p className="small mt-2 mb-0">Agrega productos desde el menú</p>
                    </div>
                  ) : (
                    pedido.map((item) => (
                      <div key={item.id} className="d-flex align-items-start gap-2 py-2 border-bottom">
                        <img
                          src={item.producto.img || ""}
                          alt=""
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                          onError={(e) => { e.target.style.display = "none" }}
                        />
                        <div className="flex-grow-1 min-w-0">
                          <div className="fw-semibold small text-truncate">{getProductoNombre(item.producto)}</div>
                          {item.toppings.length > 0 && (
                            <div className="small text-success text-truncate">
                              + {item.toppings.map(getToppingNombre).join(", ")}
                            </div>
                          )}
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <div className="input-group input-group-sm" style={{ width: 80 }}>
                              <button className="btn btn-outline-secondary btn-sm px-2"
                                onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}>−</button>
                              <span className="input-group-text px-2 text-center" style={{ minWidth: 28 }}>{item.cantidad}</span>
                              <button className="btn btn-outline-secondary btn-sm px-2"
                                onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}>+</button>
                            </div>
                            <span className="fw-bold small text-dark ms-auto">{money(item.subtotal)}</span>
                          </div>
                        </div>
                        <button className="btn btn-sm btn-outline-danger px-2" onClick={() => quitarProducto(item.id)}>×</button>
                      </div>
                    ))
                  )}
                </div>

                {/* Totales */}
                <div className="px-4 py-3 border-bottom">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Total</span>
                    <span className="fw-bold text-success fs-4">{money(total)}</span>
                  </div>
                </div>

                {/* Pago */}
                <div className="px-4 py-3">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">👤 Cliente (opcional)</label>
                    <input type="text" className="form-control form-control-sm"
                      value={cliente} onChange={(e) => setCliente(e.target.value)}
                      placeholder="Nombre del cliente" />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">💳 Método de pago</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {metodosPago.map((m) => (
                        <button
                          key={m.id}
                          className={`btn btn-sm flex-grow-1 ${metodoPago === m.nombre_metodo ? "btn-brand" : "btn-outline-secondary"}`}
                          onClick={() => {
                            setMetodoPago(m.nombre_metodo)
                            // Transferencia: monto exacto automático
                            if (m.nombre_metodo !== "Efectivo") {
                              setPago(total)
                            } else {
                              setPago(0)
                            }
                          }}
                        >
                          {m.nombre_metodo === "Efectivo" ? "💵" : m.nombre_metodo === "Transferencia" ? "📱" : "💳"} {m.nombre_metodo}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monto recibido + billetes rápidos — solo Efectivo */}
                  {metodoPago === "Efectivo" && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">💰 Monto recibido</label>
                      <input type="number" className="form-control form-control-sm mb-2"
                        value={pago || ""} min={0}
                        placeholder="Ingresa el monto..."
                        onChange={(e) => setPago(Number(e.target.value))} />
                      {/* Botones de billetes rápidos */}
                      <div className="d-flex flex-wrap gap-1">
                        {BILLETES.filter((b) => b >= Math.min(total, 1000)).map((b) => (
                          <button
                            key={b}
                            className={`btn btn-xs border px-2 py-1 ${pago === b ? "btn-brand text-white" : "btn-light"}`}
                            style={{ fontSize: "0.72rem", borderRadius: 6 }}
                            onClick={() => setPago(b)}
                          >
                            {b >= 1000 ? `$${b / 1000}K` : money(b)}
                          </button>
                        ))}
                        {total > 0 && (
                          <button
                            className={`btn btn-xs border px-2 py-1 ${pago === total ? "btn-success text-white" : "btn-light"}`}
                            style={{ fontSize: "0.72rem", borderRadius: 6 }}
                            onClick={() => setPago(total)}
                            title="Pago exacto"
                          >
                            Exacto
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transferencia: mostrar total automático */}
                  {metodoPago && metodoPago !== "Efectivo" && (
                    <div className="mb-3 p-3 rounded" style={{ background: "var(--bg-soft, #f0fdf4)", border: "1px solid #bbf7d0" }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="small fw-semibold text-success">📱 Total a transferir</span>
                        <span className="fw-bold text-success fs-5">{money(total)}</span>
                      </div>
                      <div className="small text-muted mt-1">El monto se registra automáticamente</div>
                    </div>
                  )}

                  {/* Cambio — solo Efectivo */}
                  {metodoPago === "Efectivo" && pago > 0 && (
                    <div className={`d-flex justify-content-between align-items-center rounded p-2 mb-3 ${cambio >= 0 ? "bg-success bg-opacity-10" : "bg-danger bg-opacity-10"}`}>
                      <span className="small fw-semibold">🪙 Cambio</span>
                      <span className={`fw-bold ${cambio >= 0 ? "text-success" : "text-danger"}`}>{money(cambio)}</span>
                    </div>
                  )}

                  {/* Botón cobrar */}
                  <button
                    className="btn btn-success btn-lg w-100 fw-bold py-3"
                    disabled={
                      !pedido.length ||
                      !metodoPago ||
                      cobrandoLoad ||
                      pago < total
                    }
                    onClick={cobrar}
                  >
                    {cobrandoLoad
                      ? <><span className="spinner-border spinner-border-sm me-2" />Procesando...</>
                      : `💰 COBRAR ${money(total)}`}
                  </button>

                  {pedido.length > 0 && !metodoPago && (
                    <p className="text-warning small text-center mt-2 mb-0">⚠️ Selecciona método de pago</p>
                  )}
                  {pedido.length > 0 && metodoPago === "Efectivo" && pago > 0 && pago < total && (
                    <p className="text-danger small text-center mt-2 mb-0">⚠️ Faltan {money(total - pago)} para completar el pago</p>
                  )}
                  {pedido.length > 0 && metodoPago === "Efectivo" && pago <= 0 && (
                    <p className="text-warning small text-center mt-2 mb-0">⚠️ Ingresa el monto recibido</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal vaciar pedido */}
      <ModalConfirmar
        config={modalVaciar ? {
          titulo: "¿Vaciar el pedido?",
          mensaje: "Se eliminarán todos los productos del pedido actual.",
          tipo: "danger",
          txtOk: "Vaciar",
        } : null}
        onConfirm={() => { setPedido([]); setModalVaciar(false); }}
        onCancel={() => setModalVaciar(false)}
      />

      {/* Modal éxito de venta */}
      {modalExito && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1060, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }} />
          <div style={{ position: "fixed", inset: 0, zIndex: 1065, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div className="card border-0 shadow-lg text-center" style={{ maxWidth: 400, width: "100%", borderRadius: "1.25rem" }}>
              <div className="card-body p-5">
                <div style={{ fontSize: "3.5rem" }}>✅</div>
                <h4 className="fw-bold mt-3 mb-1">¡Venta registrada!</h4>
                <p className="text-muted mb-1">Factura <strong>#{modalExito.id_factura}</strong></p>
                <div className="my-3 py-3 rounded" style={{ background: "var(--bg-soft, #f8f9fa)" }}>
                  <div className="text-muted small">Total cobrado</div>
                  <div className="fw-bold text-success" style={{ fontSize: "1.8rem" }}>{money(modalExito.total)}</div>
                </div>
                <div className="d-flex gap-2 justify-content-center mt-3">
                  <button className="btn btn-outline-secondary" onClick={() => window.print()}>
                    🖨️ Imprimir ticket
                  </button>
                  <button className="btn btn-brand px-4" onClick={() => { setModalExito(null); setVentaParaTicket(null); }}>
                    Nueva venta →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Ticket de impresión (oculto en pantalla, visible solo al imprimir) */}
      <Ticket venta={ventaParaTicket} />

      <style>{`
        .fixed-nav { position:fixed; top:0; left:0; right:0; background:white; z-index:1030; box-shadow:0 2px 20px rgba(0,0,0,.1); animation:slideDown .25s ease; }
        @keyframes slideDown { from{transform:translateY(-100%)} to{transform:translateY(0)} }
        .sticky-sidebar { position:sticky; top:90px; }
        .product-card { transition:all .25s ease; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.07); }
        .product-card.hover-lift:hover { transform:translateY(-6px); box-shadow:0 12px 30px rgba(0,0,0,.13); }
        .product-image-container { height:140px; overflow:hidden; background:#f8f9fa; }
        .product-image { width:100%; height:100%; object-fit:cover; transition:transform .3s; }
        .product-card:hover .product-image { transform:scale(1.05); }
        .product-overlay { position:absolute; bottom:8px; left:8px; }
        .product-badge-top { position:absolute; top:8px; right:8px; }
        .topping-card { border:2px solid #dee2e6; border-radius:10px; cursor:pointer; transition:all .2s; }
        .topping-card:hover { border-color:var(--brand,#0d6efd); transform:translateY(-2px); }
        .topping-active { border-color:var(--brand,#0d6efd) !important; background:var(--brand,#0d6efd) !important; color:white; }
        .cursor-pointer { cursor:pointer; }
        .hover-lift { cursor:pointer; }
        .btn-xs { font-size:.72rem; padding:.2rem .5rem; }
      `}</style>
    </>
  );
}