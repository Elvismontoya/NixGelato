import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

const money = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

const getToken = () => localStorage.getItem("token") || "";

// Helpers para soportar distintos nombres de campos según el backend
const getProductoId = (p) => p.id ?? p.id_producto;
const getProductoNombre = (p) => p.nombre ?? p.nombre_producto;
const getProductoPrecio = (p) => p.precio ?? p.precio_venta_unitario ?? 0;
const getProductoStock = (p) => p.stock ?? p.stock_actual ?? 0;
const getProductoPermiteToppings = (p) => p.permiteToppings ?? p.permite_toppings ?? false;

const getToppingNombre = (t) => t.nombre ?? t.nombre_topping;
const getToppingPrecioExtra = (t) =>
  t.precio_adicional ?? t.precio ?? 0;

export default function Pedido() {
  const navigate = useNavigate();

  // =========================
  // Estados principales
  // =========================
  const [categorias, setCategorias] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [pedido, setPedido] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [cliente, setCliente] = useState("");
  const [pago, setPago] = useState(0);
  const [metodoPago, setMetodoPago] = useState("");
  const [metodosPago, setMetodosPago] = useState([]);
  const [navbarFixed, setNavbarFixed] = useState(false);

  // Flujo
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [toppingsSeleccionados, setToppingsSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(true);

  // =========================
  // Efecto para navbar fijo al hacer scroll
  // =========================
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setNavbarFixed(true);
      } else {
        setNavbarFixed(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // =========================
  // Auth
  // =========================
  useEffect(() => {
    const t = getToken();
    if (!t) navigate("/login", { replace: true });
  }, [navigate]);

  // =========================
  // Cargar datos
  // =========================
  async function cargarDatos() {
    setCargando(true);
    try {
      const [resProductos, resToppings] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/productos`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/toppings`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      if (!resProductos.ok || !resToppings.ok) {
        throw new Error("Error cargando datos");
      }

      const dataProductos = await resProductos.json();
      const dataToppings = await resToppings.json();

      setCategorias(Array.isArray(dataProductos) ? dataProductos : []);
      setToppings(Array.isArray(dataToppings) ? dataToppings : []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      alert("Error cargando los datos del sistema");
    } finally {
      setCargando(false);
    }
  }

  function cargarMetodosPago() {
    const fake = [
      { id: 1, nombre_metodo: "Efectivo", description: "Pago en caja", activo: true },
      { id: 2, nombre_metodo: "Transferencia", description: "Nequi/Daviplata", activo: true },
      { id: 3, nombre_metodo: "Tarjeta", description: "Pago con tarjeta", activo: true },
    ];
    setMetodosPago(fake.filter((m) => m.activo));
  }

  useEffect(() => {
    cargarDatos();
    cargarMetodosPago();
  }, []);

  // =========================
  // Manejo de selección
  // =========================
  function seleccionarProducto(producto) {
    const stock = getProductoStock(producto);
    if (stock <= 0) {
      alert("Este producto no tiene stock disponible");
      return;
    }
    setProductoSeleccionado(producto);
    setToppingsSeleccionados([]);
  }

  function toggleTopping(topping) {
    setToppingsSeleccionados((prev) => {
      const existe = prev.find((t) => t.id_topping === topping.id_topping);
      return existe ? prev.filter((t) => t.id_topping !== topping.id_topping) : [...prev, topping];
    });
  }

  const precioFinal = useMemo(() => {
    if (!productoSeleccionado) return 0;
    const base = Number(getProductoPrecio(productoSeleccionado));
    const extra = toppingsSeleccionados.reduce(
      (s, t) => s + Number(getToppingPrecioExtra(t)),
      0
    );
    return Math.round(base + extra);
  }, [productoSeleccionado, toppingsSeleccionados]);

  function agregarAlPedido() {
    if (!productoSeleccionado) {
      alert("Selecciona un producto primero");
      return;
    }

    const prodId = getProductoId(productoSeleccionado);
    const prodNombre = getProductoNombre(productoSeleccionado);

    const itemPedido = {
      id: `${prodId}-${Date.now()}`,
      producto: productoSeleccionado,
      tamano: "Único",
      toppings: [...toppingsSeleccionados],
      cantidad: 1,
      precioUnitario: precioFinal,
      subtotal: precioFinal,
    };

    setPedido((prev) => [...prev, itemPedido]);
    resetSeleccion();
  }

  function resetSeleccion() {
    setProductoSeleccionado(null);
    setToppingsSeleccionados([]);
  }

  // =========================
  // Pedido existente
  // =========================
  function quitarProducto(id) {
    setPedido((prev) => prev.filter((i) => i.id !== id));
  }

  function cambiarCantidad(id, val) {
    const nuevaCantidad = Number(val);
    if (nuevaCantidad < 1) return;

    setPedido((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const nuevoSubtotal = i.precioUnitario * nuevaCantidad;
          return { ...i, cantidad: nuevaCantidad, subtotal: nuevoSubtotal };
        }
        return i;
      })
    );
  }

  function vaciarPedido() {
    if (!pedido.length) return;
    if (confirm("¿Estás seguro de que quieres vaciar el pedido?")) setPedido([]);
  }

  // =========================
  // Cálculos
  // =========================
  const subtotal = pedido.reduce((sum, i) => sum + i.subtotal, 0);
  const descuentoNormalizado = Math.max(0, Math.min(descuento, subtotal));
  const total = Math.max(subtotal - descuentoNormalizado, 0);
  const cambio = Math.max(pago - total, 0);

  // =========================
  // Cobrar
  // =========================
  async function cobrar() {
    if (!pedido.length) return alert("No hay productos en el pedido.");
    if (!metodoPago) return alert("Seleccione método de pago.");
    if (pago < total) return alert("El pago es insuficiente.");

    const payload = {
      cliente,
      subtotal,
      descuento: descuentoNormalizado,
      total,
      metodo_pago: metodoPago,
      productos: pedido.map((item) => ({
        id: getProductoId(item.producto),
        cantidad: item.cantidad,
        precio: item.precioUnitario,
        tamano: item.tamano,
        toppings: item.toppings.map((t) => t.id_topping),
      })),
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/facturas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(`✅ Factura #${data.id_factura} registrada correctamente`);

      // reset
      setPedido([]);
      setCliente("");
      setPago(0);
      setDescuento(0);
      setMetodoPago("");
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }

  // =========================
  // UI
  // =========================
  if (cargando) {
    return (
      <>
        <nav className={`navbar navbar-expand-lg border-bottom ${navbarFixed ? 'fixed-nav' : ''}`}>
          <div className="container">
            <Link className="navbar-brand fw-semibold" to="/">
              🍨 NixGelato
            </Link>
          </div>
        </nav>
        <main className="container my-4">
          <div className="text-center py-5">
            <div className="spinner-border text-brand" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3">Cargando sistema de caja...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {/* NAV MEJORADO CON EFECTO FIXED */}
      <nav className={`navbar navbar-expand-lg border-bottom ${navbarFixed ? 'fixed-nav' : ''}`}>
        <div className="container">
          <Link className="navbar-brand fw-semibold" to="/">
            🍨 NixGelato - Sistema de Caja
          </Link>
          <div className="d-flex gap-2 align-items-center">
            <div className="d-none d-sm-flex gap-2 me-3">
              <span className="badge bg-success">{pedido.length} items</span>
              <span className="badge bg-brand">{money(total)}</span>
            </div>
            <Link className="btn btn-sm btn-outline-brand" to="/admin">
              Panel Admin
            </Link>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => navigate("/login")}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* ESPACIO PARA EL NAVBAR FIXED */}
      {navbarFixed && <div style={{ height: '70px' }}></div>}

      <main className="container-fluid py-4">
        <div className="row g-4">
          {/* PANEL PRINCIPAL - PRODUCTOS */}
          <div className="col-xl-8 col-lg-7">
            <div className="card card-soft shadow-sm h-100">
              <div className="card-header bg-white border-0 py-4">
                <div className="row align-items-center">
                  <div className="col">
                    <h4 className="fw-bold mb-2 text-dark">
                      {!productoSeleccionado ? "Menú de Productos" : "Personalizar Producto"}
                    </h4>
                    <p className="text-muted mb-0">
                      {!productoSeleccionado 
                        ? "Selecciona un producto para comenzar tu pedido" 
                        : `Estás personalizando: ${getProductoNombre(productoSeleccionado)}`
                      }
                    </p>
                  </div>
                  <div className="col-auto">
                    <div className="d-flex gap-3">
                      <div className="text-center">
                        <div className="fw-bold text-success fs-4">{pedido.length}</div>
                        <small className="text-muted">Items</small>
                      </div>
                      <div className="text-center">
                        <div className="fw-bold text-brand fs-4">{money(total)}</div>
                        <small className="text-muted">Total</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body p-4">
                {/* VISTA DE CATEGORÍAS Y PRODUCTOS */}
                {!productoSeleccionado && (
                  <div className="categories-container">
                    {categorias.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="empty-state">
                          <div className="empty-state-icon">📦</div>
                          <h5 className="mt-3">No hay productos disponibles</h5>
                          <p className="text-muted">Contacta al administrador del sistema</p>
                        </div>
                      </div>
                    ) : (
                      categorias.map((categoria, index) => (
                        <section key={categoria.id ?? categoria.id_categoria} className="category-section">
                          <div className="category-header d-flex align-items-center justify-content-between mb-4">
                            <div>
                              <h5 className="fw-bold text-dark mb-1">{categoria.nombre}</h5>
                              <span className="text-muted small">
                                {categoria.productos?.length || 0} productos disponibles
                              </span>
                            </div>
                            <div className="category-badge">
                              <span className="badge bg-light text-dark">{categoria.productos?.length || 0}</span>
                            </div>
                          </div>

                          <div className="row g-3">
                            {categoria.productos?.map((producto) => {
                              const prodId = getProductoId(producto);
                              const prodNombre = getProductoNombre(producto);
                              const precio = getProductoPrecio(producto);
                              const stock = getProductoStock(producto);
                              const permiteToppings = getProductoPermiteToppings(producto);
                              
                              return (
                                <div className="col-xxl-3 col-lg-4 col-md-6" key={prodId}>
                                  <div
                                    className={`product-card card border-0 h-100 ${
                                      stock <= 0 ? "opacity-50" : "hover-lift cursor-pointer"
                                    }`}
                                    onClick={() => seleccionarProducto(producto)}
                                  >
                                    <div className="product-image-container position-relative">
                                      <img
                                        src={producto.img || "/placeholder-image.jpg"}
                                        alt={prodNombre}
                                        className="product-image"
                                        onError={(e) => {
                                          e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDIwMCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTYwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04MCA4MEw3MCA3MEg2MEw1MCA4MEw2MCA5MEg3MEw4MCA4MFoiIGZpbGw9IiNENkQ2RDYiLz4KPC9zdmc+";
                                        }}
                                      />
                                      <div className="product-overlay">
                                        {stock <= 0 ? (
                                          <span className="badge bg-danger">Sin Stock</span>
                                        ) : (
                                          <span className="badge bg-success">Disponible</span>
                                        )}
                                      </div>
                                      {permiteToppings && (
                                        <div className="product-badge-top">
                                          <span className="badge bg-info">+ Toppings</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="card-body p-3">
                                      <h6 className="product-title fw-semibold text-dark mb-2">
                                        {prodNombre}
                                      </h6>
                                      
                                      <div className="product-details">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <span className="product-price fw-bold text-success">
                                            {money(precio)}
                                          </span>
                                          <span className={`stock-badge badge ${
                                            stock > 10 ? 'bg-success' : 
                                            stock > 0 ? 'bg-warning' : 'bg-danger'
                                          }`}>
                                            Stock: {stock}
                                          </span>
                                        </div>
                                        
                                        <div className="product-features">
                                          {permiteToppings && (
                                            <span className="feature-tag">🎯 Personalizable</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {index < categorias.length - 1 && <hr className="my-5" />}
                        </section>
                      ))
                    )}
                  </div>
                )}

                {/* VISTA DE PERSONALIZACIÓN */}
                {productoSeleccionado && (
                  <div className="customization-view">
                    <div className="navigation-header mb-4">
                      <button
                        className="btn btn-outline-secondary btn-lg"
                        onClick={resetSeleccion}
                      >
                        ← Volver al Menú
                      </button>
                    </div>

                    <div className="row">
                      <div className="col-lg-8">
                        {/* TOPPINGS */}
                        {getProductoPermiteToppings(productoSeleccionado) && (
                          <div className="toppings-section mb-5">
                            <div className="section-header mb-4">
                              <h5 className="fw-bold mb-2">🎯 Toppings Disponibles</h5>
                              <p className="text-muted mb-0">Selecciona los toppings que deseas agregar</p>
                            </div>
                            
                            <div className="row g-3">
                              {toppings.length === 0 ? (
                                <div className="col-12">
                                  <div className="empty-toppings text-center py-4">
                                    <div className="empty-state-icon">🍬</div>
                                    <h6 className="mt-3">No hay toppings disponibles</h6>
                                    <p className="text-muted small">Puedes continuar sin toppings</p>
                                  </div>
                                </div>
                              ) : (
                                toppings.map((topping) => {
                                  const activo = !!toppingsSeleccionados.find(
                                    (t) => t.id_topping === topping.id_topping
                                  );
                                  const nombreTop = getToppingNombre(topping);
                                  const precioExtra = getToppingPrecioExtra(topping);
                                  
                                  return (
                                    <div className="col-xl-4 col-md-6" key={topping.id_topping}>
                                      <div
                                        className={`topping-card card h-100 text-center ${
                                          activo ? 'topping-active' : ''
                                        }`}
                                        onClick={() => toggleTopping(topping)}
                                      >
                                        <div className="card-body p-4">
                                          <div className="topping-icon mb-3">
                                            {activo ? '✅' : '➕'}
                                          </div>
                                          <h6 className="topping-name fw-semibold mb-2">
                                            {nombreTop}
                                          </h6>
                                          <div className={`topping-price fw-bold ${
                                            activo ? 'text-success' : 'text-brand'
                                          }`}>
                                            +{money(precioExtra)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {/* RESUMEN DEL PRODUCTO */}
                        <div className="product-summary-card card bg-light border-0">
                          <div className="card-body p-4">
                            <h6 className="fw-bold mb-3">📋 Resumen del Producto</h6>
                            <div className="summary-details">
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="text-muted">Producto base:</span>
                                <span className="fw-semibold">
                                  {money(getProductoPrecio(productoSeleccionado))}
                                </span>
                              </div>
                              
                              {toppingsSeleccionados.length > 0 && (
                                <div className="toppings-summary mb-3">
                                  <div className="text-muted mb-2">Toppings seleccionados:</div>
                                  <div className="selected-toppings">
                                    {toppingsSeleccionados.map((topping, index) => (
                                      <span key={index} className="selected-topping-badge">
                                        {getToppingNombre(topping)} (+{money(getToppingPrecioExtra(topping))})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="total-product-price border-top pt-3">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="fw-bold">Total del producto:</span>
                                  <span className="fw-bold text-success fs-4">
                                    {money(precioFinal)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-lg-4">
                        <div className="action-sidebar">
                          <div className="action-card card border-0 bg-brand text-white">
                            <div className="card-body text-center p-4">
                              <div className="action-icon mb-3">🛒</div>
                              <h5 className="fw-bold mb-3">¿Listo para agregar?</h5>
                              <p className="mb-4 opacity-75">
                                Agrega este producto personalizado a tu pedido actual
                              </p>
                              <button
                                className="btn btn-light btn-lg w-100 fw-bold"
                                onClick={agregarAlPedido}
                              >
                                Agregar al Pedido
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PANEL LATERAL - RESUMEN Y PAGO */}
          <div className="col-xl-4 col-lg-5">
            <div className="order-summary-card card card-soft shadow-sm sticky-sidebar">
              <div className="card-header bg-white border-0 py-4">
                <h4 className="fw-bold mb-0">🛒 Tu Pedido</h4>
              </div>

              <div className="card-body p-0">
                {/* LISTA DE PRODUCTOS EN EL PEDIDO */}
                <div className="order-items-section p-4 border-bottom">
                  <div className="order-items-container">
                    {pedido.length === 0 ? (
                      <div className="empty-order text-center py-4">
                        <div className="empty-order-icon">📝</div>
                        <h6 className="mt-3">Pedido vacío</h6>
                        <p className="text-muted small">Agrega productos desde el menú</p>
                      </div>
                    ) : (
                      pedido.map((item) => (
                        <div key={item.id} className="order-item">
                          <div className="d-flex gap-3">
                            <img
                              src={item.producto.img || "/placeholder-image.jpg"}
                              alt={getProductoNombre(item.producto)}
                              className="order-item-image"
                              onError={(e) => {
                                e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0zMCAzN0wyNSA0MkgyNUwyMCAzN0wyNSAzMkgyNUwzMCAzN1oiIGZpbGw9IiNENkQ2RDYiLz4KPC9zdmc+";
                              }}
                            />
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <h6 className="order-item-name fw-semibold mb-0">
                                  {getProductoNombre(item.producto)}
                                </h6>
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => quitarProducto(item.id)}
                                >
                                  ×
                                </button>
                              </div>
                              
                              {item.toppings.length > 0 && (
                                <div className="order-item-toppings mb-2">
                                  <small className="text-success">
                                    + {item.toppings.map(t => getToppingNombre(t)).join(', ')}
                                  </small>
                                </div>
                              )}
                              
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="quantity-controls">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={item.cantidad}
                                    min={1}
                                    onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                                    style={{ width: '70px' }}
                                  />
                                </div>
                                <span className="order-item-price fw-bold text-dark">
                                  {money(item.subtotal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* RESUMEN DE PAGOS */}
                <div className="payment-summary-section p-4 border-bottom">
                  <div className="payment-line d-flex justify-content-between mb-2">
                    <span className="text-muted">Subtotal:</span>
                    <span className="fw-semibold">{money(subtotal)}</span>
                  </div>
                  
                  <div className="payment-line d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted">Descuento:</span>
                    <div className="discount-input">
                      <input
                        type="number"
                        className="form-control form-control-sm text-end"
                        value={descuento}
                        min={0}
                        max={subtotal}
                        onChange={(e) => setDescuento(Number(e.target.value))}
                        style={{ width: '120px' }}
                      />
                    </div>
                  </div>
                  
                  <div className="payment-total d-flex justify-content-between align-items-center pt-3 border-top">
                    <span className="fw-bold fs-5">Total a pagar:</span>
                    <span className="fw-bold text-success fs-4">{money(total)}</span>
                  </div>
                </div>

                {/* INFORMACIÓN DE PAGO */}
                <div className="payment-info-section p-4">
                  <div className="mb-4">
                    <label className="form-label fw-semibold mb-2">👤 Cliente (opcional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      placeholder="Nombre del cliente"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold mb-2">💳 Método de pago</label>
                    <select
                      className="form-select"
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                    >
                      <option value="">Seleccionar método...</option>
                      {metodosPago.map((m) => (
                        <option key={m.id} value={m.nombre_metodo}>
                          {m.nombre_metodo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-7">
                      <label className="form-label fw-semibold mb-2">💰 Pago recibido</label>
                      <input
                        type="number"
                        className="form-control"
                        value={pago}
                        onChange={(e) => setPago(Number(e.target.value))}
                        min={0}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-5">
                      <label className="form-label fw-semibold mb-2">🪙 Cambio</label>
                      <div className="change-display form-control bg-success bg-opacity-10 fw-bold text-success text-center">
                        {money(cambio)}
                      </div>
                    </div>
                  </div>

                  <div className="action-buttons">
                    <button
                      className="btn btn-success btn-lg w-100 fw-bold py-3 mb-2"
                      disabled={!pedido.length || !metodoPago}
                      onClick={cobrar}
                    >
                      💰 COBRAR {money(total)}
                    </button>
                    
                    {pedido.length > 0 && (
                      <button
                        className="btn btn-outline-danger w-100"
                        onClick={vaciarPedido}
                      >
                        🗑️ Vaciar Pedido
                      </button>
                    )}
                  </div>

                  {pedido.length > 0 && !metodoPago && (
                    <div className="alert alert-warning mt-3 text-center">
                      ⚠️ Selecciona un método de pago para continuar
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ESTILOS MEJORADOS */}
      <style>{`
        .fixed-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: white;
          z-index: 1030;
          box-shadow: 0 2px 20px rgba(0,0,0,0.1);
          animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        
        .sticky-sidebar {
          position: sticky;
          top: 90px;
        }
        
        .product-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 12px;
          overflow: hidden;
        }
        
        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        }
        
        .product-image-container {
          height: 160px;
          overflow: hidden;
        }
        
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        
        .product-card:hover .product-image {
          transform: scale(1.05);
        }
        
        .product-overlay {
          position: absolute;
          top: 12px;
          left: 12px;
        }
        
        .product-badge-top {
          position: absolute;
          top: 12px;
          right: 12px;
        }
        
        .topping-card {
          transition: all 0.3s ease;
          cursor: pointer;
          border: 2px solid transparent;
          border-radius: 12px;
        }
        
        .topping-card:hover {
          border-color: var(--brand);
          transform: translateY(-2px);
        }
        
        .topping-active {
          border-color: var(--brand);
          background-color: var(--brand);
          color: white;
        }
        
        .topping-active .topping-price {
          color: white !important;
        }
        
        .selected-toppings {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .selected-topping-badge {
          background: var(--success);
          color: white;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .order-item {
          padding: 16px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .order-item:last-child {
          border-bottom: none;
        }
        
        .order-item-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
        }
        
        .empty-state {
          padding: 60px 20px;
        }
        
        .empty-state-icon {
          font-size: 4rem;
          opacity: 0.5;
        }
        
        .category-section {
          margin-bottom: 3rem;
        }
        
        .category-header {
          padding: 0 1rem;
        }
        
        .action-card {
          border-radius: 16px;
          background: linear-gradient(135deg, var(--brand), var(--brand-dark));
        }
        
        .hover-lift {
          transition: transform 0.2s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-2px);
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .feature-tag {
          background: var(--info);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 500;
        }
        
        .stock-badge {
          font-size: 0.7rem;
        }
        
        .product-title {
          font-size: 0.9rem;
          line-height: 1.3;
        }
        
        .order-items-container {
          max-height: 400px;
          overflow-y: auto;
          padding-right: 8px;
        }
        
        .order-items-container::-webkit-scrollbar {
          width: 4px;
        }
        
        .order-items-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        
        .order-items-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        
        .order-items-container::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </>
  );
}