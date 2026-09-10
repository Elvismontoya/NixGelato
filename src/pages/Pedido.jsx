import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import ModalConfirmar from "../components/ModalConfirmar.jsx";
import ModalVentaExito from "../components/pedido/ModalVentaExito.jsx";
import MenuProductos from "../components/pedido/MenuProductos.jsx";
import PersonalizarToppings from "../components/pedido/PersonalizarToppings.jsx";
import PanelPago from "../components/pedido/PanelPago.jsx";
import Ticket from "../components/Ticket.jsx";
import { getProductos } from "../api/productos.js";
import { getToppings } from "../api/toppings.js";
import { getConfig } from "../api/config.js";
import { getMetodosPago, registrarVenta } from "../api/facturas.js";
import { getPerfil } from "../api/auth.js";
import { money } from "../domain/money.js";
import {
  precioConToppings, totalPedido, calcularCambio, billetesSugeridos, puedeCobrar,
} from "../domain/pedido.js";
import useSession from "../hooks/useSession.js";
import {
  idProducto as getProductoId,
  nombreProducto as getProductoNombre,
  precioProducto as getProductoPrecio,
  stockProducto as getProductoStock,
  permiteToppings as getProductoPermiteToppings,
  nombreTopping as getToppingNombre,
  precioTopping as getToppingPrecio,
} from "../domain/producto.js";

// Billetes comunes en Colombia
const BILLETES = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

export default function Pedido() {
  const navigate = useNavigate();
  const { token, logout } = useSession();

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
  const [negocio, setNegocio] = useState(null); // config del negocio para el ticket

  // ── Navbar fijo ────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setNavbarFixed(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Auth ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Obtener nombre del empleado actual para el ticket (siempre actualizado)
  useEffect(() => {
    getPerfil()
      .then((data) => {
        if (data?.nombres) {
          localStorage.setItem("nombreEmpleado", `${data.nombres} ${data.apellidos || ""}`.trim());
        } else {
          localStorage.removeItem("nombreEmpleado");
        }
      })
      .catch(() => {});
  }, []);


  // ── Cargar datos ───────────────────────────────────────────
  async function cargarDatos() {
    setCargando(true);
    try {
      const [cats, tops, cfg] = await Promise.all([
        getProductos(),
        getToppings(),
        getConfig().catch(() => null),
      ]);
      setCategorias(Array.isArray(cats) ? cats : []);
      setToppings(Array.isArray(tops) ? tops : []);
      setNegocio(cfg);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }

  async function cargarMetodosPago() {
    try {
      const data = await getMetodosPago();
      setMetodosPago(Array.isArray(data)
        ? data.map((m) => ({ id: m.id_metodo, nombre_metodo: m.nombre_metodo }))
        : []);
    } catch {
      setMetodosPago([]);
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
    return precioConToppings(
      getProductoPrecio(productoSeleccionado),
      toppingsSeleccionados.map(getToppingPrecio),
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
  const subtotal              = totalPedido(pedido);
  const total                 = subtotal;
  const cambio                = calcularCambio(pago, total);

  // Si el método es transferencia, sincronizar pago con total automáticamente
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
        if (puedeCobrar({ items: pedido, metodoPago, pago, total }) && !cobrandoLoad) {
          e.preventDefault();
          cobrar();
        }
        return;
      }

      // Números 1-8: seleccionar billete rápido (solo si NO está escribiendo y método es Efectivo)
      if (!escribiendo && metodoPago === "Efectivo" && /^[1-8]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        const billetesDisponibles = billetesSugeridos(total, BILLETES);
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
    // cobrar() se invoca con estos mismos valores ya listados como deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalExito, modalVaciar, productoSeleccionado, pedido, metodoPago, pago, total, cobrandoLoad]);

  // ── Cobrar ─────────────────────────────────────────────────
  async function cobrar() {
    if (!pedido.length || !metodoPago) return;
    setCobrandoLoad(true);
    try {
      const data = await registrarVenta({
        cliente,
        metodo_pago: metodoPago,
        // subtotal/total/precio: el backend nuevo los ignora (recalcula desde
        // la BD); se envían por compatibilidad con la versión anterior.
        subtotal,
        total,
        productos: pedido.map((item) => ({
          id: getProductoId(item.producto),
          cantidad: item.cantidad,
          precio: item.precioUnitario,
          toppings: item.toppings.map((t) => t.id_topping),
        })),
      });

      // El servidor recalcula el total; usarlo como fuente de verdad.
      const totalReal = Number.isFinite(Number(data.total)) ? Number(data.total) : total;
      const cambioReal = calcularCambio(pago, totalReal);

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
        total: totalReal,
        // Desglose fiscal calculado por la BD (IVA por producto).
        total_iva:  Number(data.total_iva)  || 0,
        total_base: Number(data.total_base) || 0,
        metodoPago,
        pago,
        cambio: cambioReal,
      });

      // Mostrar modal de éxito
      setModalExito({ id_factura: data.id_factura, total: totalReal });

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

                {!productoSeleccionado && (
                  <MenuProductos
                    busqueda={busqueda}
                    setBusqueda={setBusqueda}
                    productosFiltrados={productosFiltrados}
                    categorias={categorias}
                    onSeleccionar={seleccionarProducto}
                  />
                )}

                {/* Vista personalización (toppings) */}
                {productoSeleccionado && (
                  <PersonalizarToppings
                    producto={productoSeleccionado}
                    toppings={toppings}
                    seleccionados={toppingsSeleccionados}
                    precioFinal={precioFinal}
                    onToggle={toggleTopping}
                    onVolver={() => { setProductoSeleccionado(null); setToppingsSeleccionados([]); }}
                    onAgregar={agregarAlPedido}
                  />
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
                <PanelPago
                  cliente={cliente} setCliente={setCliente}
                  metodosPago={metodosPago} metodoPago={metodoPago}
                  onSelectMetodo={(m) => {
                    setMetodoPago(m.nombre_metodo);
                    setPago(m.nombre_metodo !== "Efectivo" ? total : 0);
                  }}
                  pago={pago} setPago={setPago}
                  total={total} cambio={cambio}
                  items={pedido} cobrandoLoad={cobrandoLoad} onCobrar={cobrar}
                />
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
      <ModalVentaExito
        venta={modalExito}
        onImprimir={() => window.print()}
        onNuevaVenta={() => { setModalExito(null); setVentaParaTicket(null); }}
      />

      {/* Ticket de impresión (oculto en pantalla, visible solo al imprimir) */}
      <Ticket venta={ventaParaTicket} negocio={negocio} />

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