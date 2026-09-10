import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/pedido", label: "Caja" },
  { to: "/admin", label: "Productos" },
  { to: "/admin/empleados", label: "Empleados" },
  { to: "/admin/inventario", label: "Inventario" },
  { to: "/facturas", label: "Ventas" },
  { to: "/admin/auditoria", label: "Auditoría" },
  { to: "/admin/caja", label: "Caja" },
];

export default function AdminNavbar({ onLogout }) {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);

  const active = (path) =>
    pathname === path ? "btn-brand" : "btn-outline-brand";

  // Cerrar el menú al cambiar de ruta (navegación en móvil).
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  return (
    <nav className="navbar navbar-expand-lg border-bottom sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          🍨 NixGelato
        </Link>

        {/* Toggle propio (no depende del JS de Bootstrap) */}
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="adminNav"
          aria-expanded={abierto}
          aria-label="Abrir menú"
          onClick={() => setAbierto((v) => !v)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div
          className={`${abierto ? "d-block" : "d-none"} d-lg-flex flex-grow-1`}
          id="adminNav"
        >
          <div className="d-flex flex-wrap gap-2 ms-auto align-items-center mt-2 mt-lg-0">
            {LINKS.map((l) => (
              <Link
                key={l.to + l.label}
                className={`btn btn-sm ${active(l.to)}`}
                to={l.to}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={onLogout}
              className="btn btn-sm btn-outline-secondary"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
