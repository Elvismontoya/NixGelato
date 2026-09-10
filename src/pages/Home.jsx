import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Home() {
  const [currentMetric, setCurrentMetric] = useState(0);

  // Rotación de métricas destacadas
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMetric((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { value: "2", label: "Roles de usuario" },
    { value: "100%", label: "En la nube" },
    { value: "∞", label: "Productos posibles" },
  ];

  return (
    <>
      {/* Navbar mejorada */}
      <nav className="navbar navbar-expand-lg border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">
            🍨 NixGelato
          </Link>
          <Link
            className="btn btn-brand btn-sm px-3 py-2 fw-semibold shadow-sm"
            to="/login"
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="container my-5">
        {/* HERO mejorado */}
        <section className="hero row align-items-center g-5 mb-5 py-4 mt-2">
          <div className="col-lg-6 text-center text-lg-start">
            <span className="badge bg-primary bg-opacity-10 text-primary mb-3 px-3 py-2 rounded-pill fw-normal">
              ✨ Versión demo para heladerías modernas
            </span>

            <h1 className="display-4 fw-bold mb-3 lh-sm">
              ¡Bienvenido a <span className="text-primary">NixGelato</span>!
            </h1>
            <p className="lead mb-4 fs-5">
              Administra fácilmente los pedidos de tu heladería con una interfaz
              moderna, rápida y adaptable. Controla sabores, toppings y cobros
              en cuestión de segundos.
            </p>

            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
              <Link
                to="/login"
                className="btn btn-brand btn-lg px-4 py-3 fw-semibold shadow"
              >
                Comenzar ahora
              </Link>
            </div>
          </div>

          {/* Imagen lateral mejorada */}
          <div className="col-lg-6 text-center position-relative">
            <div className="position-relative">
              <div className="card card-soft shadow border-0 overflow-hidden rounded-4">
                <img
                  src="https://images.pexels.com/photos/5060281/pexels-photo-5060281.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Helados y toppings"
                  className="img-fluid rounded-4"
                />
                <div className="position-absolute top-0 start-0 w-100 h-100 bg-primary bg-opacity-10 rounded-4"></div>
              </div>
            </div>
          </div>
        </section>

        {/* QUÉ ES / ESCALABLE mejorado */}
        <section className="mb-5">
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="card card-soft h-100 border-0 shadow-sm hover-lift">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                      <span className="text-primary fs-4">❓</span>
                    </div>
                    <h5 className="card-title mb-0 fw-bold">
                      ¿Qué es NixGelato?
                    </h5>
                  </div>
                  <p className="mb-3">
                    Es una aplicación diseñada para gestionar los procesos de
                    venta en heladerías. Permite tomar pedidos, calcular totales
                    automáticamente y simplificar el flujo de trabajo del
                    cajero.
                  </p>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <span className="text-primary me-2">✓</span>
                      Agrega productos y toppings con un clic.
                    </li>
                    <li className="mb-2">
                      <span className="text-primary me-2">✓</span>
                      Aplica descuentos sin hacer cuentas a mano.
                    </li>
                    <li>
                      <span className="text-primary me-2">✓</span>
                      Obtén un resumen del pedido antes de cobrar.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card card-soft h-100 border-0 shadow-sm hover-lift">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                      <span className="text-primary fs-4">🚀</span>
                    </div>
                    <h5 className="card-title mb-0 fw-bold">
                      Escalable a futuro
                    </h5>
                  </div>
                  <p className="mb-3">
                    Esta versión está pensada para crecer con tu negocio:
                  </p>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <span className="text-primary me-2">✓</span>
                      Integración con inventario y control de stock.
                    </li>
                    <li className="mb-2">
                      <span className="text-primary me-2">✓</span>
                      Reportes automáticos de ventas y cierres de caja.
                    </li>
                    <li>
                      <span className="text-primary me-2">✓</span>
                      Manejo de múltiples usuarios y roles.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFICIOS CLAVE mejorado */}
        <section className="mb-5">
          <h2 className="h3 fw-bold text-center mb-5">Beneficios clave</h2>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card card-soft h-100 text-center p-4 border-0 shadow-sm hover-lift">
                <div
                  className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <div className="fs-2">⚡</div>
                </div>
                <h5 className="mb-3 fw-bold">Pedidos rápidos</h5>
                <p className="mb-0">
                  Registra pedidos en segundos con un flujo pensado para cajas
                  ocupadas y filas largas.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card card-soft h-100 text-center p-4 border-0 shadow-sm hover-lift">
                <div
                  className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <div className="fs-2">📊</div>
                </div>
                <h5 className="mb-3 fw-bold">Todo bajo control</h5>
                <p className="mb-0">
                  Visualiza el total del pedido, descuentos aplicados y método
                  de pago en un solo lugar.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card card-soft h-100 text-center p-4 border-0 shadow-sm hover-lift">
                <div
                  className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: "70px", height: "70px" }}
                >
                  <div className="fs-2">🧩</div>
                </div>
                <h5 className="mb-3 fw-bold">Flexible y modular</h5>
                <p className="mb-0">
                  Agrega nuevos productos, categorías y toppings sin cambiar la
                  forma de trabajar de tu equipo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA mejorado */}
        <section id="como-funciona" className="mb-5">
          <h2 className="h3 fw-bold text-center mb-5">
            ¿Cómo funciona NixGelato?
          </h2>
          <div className="row g-4">
            {/* Paso 1 */}
            <div className="col-md-4">
              <div className="card card-soft h-100 border-0 shadow-sm hover-lift position-relative">
                <div className="position-absolute top-0 start-0 mt-3 ms-3"></div>
                <div className="card-body p-4 pt-5">
                  <h5 className="fw-bold mb-3">Configura tu heladería</h5>
                  <p className="mb-0">
                    Crea tus categorías, productos y toppings desde el panel de
                    administración.
                  </p>
                </div>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="col-md-4">
              <div className="card card-soft h-100 border-0 shadow-sm hover-lift position-relative">
                <div className="position-absolute top-0 start-0 mt-3 ms-3"></div>
                <div className="card-body p-4 pt-5">
                  <h5 className="fw-bold mb-3">Toma el pedido</h5>
                  <p className="mb-0">
                    El cajero selecciona el producto, ajusta cantidades y añade
                    toppings opcionales.
                  </p>
                </div>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="col-md-4">
              <div className="card card-soft h-100 border-0 shadow-sm hover-lift position-relative">
                <div className="position-absolute top-0 start-0 mt-3 ms-3"></div>
                <div className="card-body p-4 pt-5">
                  <h5 className="fw-bold mb-3">Cobra y registra la venta</h5>
                  <p className="mb-0">
                    El sistema calcula el total, aplica descuentos y guarda la
                    factura con el método de pago elegido.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFICIOS con ícono */}
        <section className="mb-5">
          <div className="card card-soft border-0 shadow-sm overflow-hidden">
            <div className="card-body p-4 p-md-5">
              <div className="row align-items-center">
                <div className="col-md-8 text-center text-md-start">
                  <h5 className="fw-bold mb-2">
                    <span className="me-2">🍦</span> Pensado para heladerías
                    reales
                  </h5>
                  <p className="mb-0 text-muted">
                    Ideal para proyectos académicos, pruebas con clientes o la
                    primera versión de tu sistema de punto de venta.
                  </p>
                </div>
                <div className="col-md-4 text-center text-md-end mt-3 mt-md-0">
                  <div className="d-flex justify-content-center justify-content-md-end gap-4">
                    <div className="text-center">
                      <div className="h3 mb-0 fw-bold text-primary metric-transition">
                        {metrics[currentMetric].value}
                      </div>
                      <small className="text-muted">
                        {metrics[currentMetric].label}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIOS mejorados */}
        <section className="mb-5">
          <h2 className="h3 fw-bold text-center mb-5">
            Lo que dicen nuestros usuarios
          </h2>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card card-soft border-0 shadow-sm p-4">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="rounded-circle bg-primary bg-opacity-10 d-flex 
            align-items-center justify-content-center me-3"
                    style={{ width: "50px", height: "50px" }}
                  >
                    <span className="fs-4">👩‍🍳</span>
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold">Ana Rodríguez</h6>
                    <small className="text-muted">
                      Heladería "Dulce Sabor"
                    </small>
                  </div>
                </div>
                <p className="mb-0">
                  "NixGelato ha simplificado nuestro proceso de ventas. Ahora
                  atendemos a más clientes en menos tiempo y con menos errores."
                </p>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card card-soft border-0 shadow-sm p-4">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="rounded-circle bg-primary bg-opacity-10 d-flex 
            align-items-center justify-content-center me-3"
                    style={{ width: "50px", height: "50px" }}
                  >
                    <span className="fs-4">🧁</span>
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold">Carlos Méndez</h6>
                    <small className="text-muted">
                      Heladería "Frosty Delights"
                    </small>
                  </div>
                </div>
                <p className="mb-0">
                  "La interfaz es tan intuitiva que nuestro personal aprendió a
                  usarla en minutos. ¡Increíble para la temporada alta!"
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER mejorado */}
      <footer className="py-3 mt-3">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-4 text-center text-md-start mb-3 mb-md-0">
              <Link
                to="/"
                className="text-decoration-none fw-bold text-gradient d-flex align-items-center"
              >
                <span className="display-6 me-2">🍨</span>
                <span>&copy; 2024 NixGelato</span>
              </Link>
            </div>
            <div className="col-md-4 text-center mb-3 mb-md-0">
              <p className="mb-0 text-muted">
                Desarrollado por Elvis Montoya y Juan Hernandez
              </p>
            </div>
            <div className="col-md-4 text-center text-md-end">
              <div className="d-flex justify-content-center justify-content-md-end gap-4">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-decoration-none text-muted hover-lift d-flex align-items-center"
                >
                  <span className="me-1">📷</span> Instagram
                </a>
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-decoration-none text-muted hover-lift d-flex align-items-center"
                >
                  <span className="me-1">👥</span> Facebook
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
