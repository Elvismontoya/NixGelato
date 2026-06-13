import { Link, useLocation } from 'react-router-dom'

export default function AdminNavbar({ onLogout }) {
  const { pathname } = useLocation()
  const active = (path) => pathname === path ? 'btn-brand' : 'btn-outline-brand'

  return (
    <nav className="navbar navbar-expand-lg border-bottom sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">🍨 NixGelato</Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#adminNav"
          aria-controls="adminNav"
          aria-expanded="false"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="adminNav">
          <div className="d-flex flex-wrap gap-2 ms-auto align-items-center mt-2 mt-lg-0">
            <Link className={`btn btn-sm ${active('/pedido')}`}      to="/pedido">Caja</Link>
            <Link className={`btn btn-sm ${active('/admin')}`}       to="/admin">Productos</Link>
            <Link className={`btn btn-sm ${active('/admin/empleados')}`} to="/admin/empleados">Empleados</Link>
            <Link className={`btn btn-sm ${active('/admin/inventario')}`} to="/admin/inventario">Inventario</Link>
            <Link className={`btn btn-sm ${active('/facturas')}`}    to="/facturas">Ventas</Link>
            <Link className={`btn btn-sm ${active('/admin/auditoria')}`} to="/admin/auditoria">Auditoría</Link>
            <Link className={`btn btn-sm ${active('/admin/caja')}`}  to="/admin/caja">Caja</Link>
            <button onClick={onLogout} className="btn btn-sm btn-outline-secondary">
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
