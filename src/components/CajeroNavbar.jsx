import { Link, useLocation } from 'react-router-dom'

export default function CajeroNavbar({ onLogout }) {
  const { pathname } = useLocation()
  const active = (path) => pathname === path ? 'btn-brand' : 'btn-outline-brand'

  return (
    <nav className="navbar navbar-expand-lg border-bottom sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/pedido">🍨 NixGelato</Link>
        <div className="d-flex gap-2 ms-auto align-items-center">
          <Link className={`btn btn-sm ${active('/pedido')}`}   to="/pedido">Caja</Link>
          <Link className={`btn btn-sm ${active('/facturas')}`} to="/facturas">Ventas</Link>
          <button onClick={onLogout} className="btn btn-sm btn-outline-secondary">Salir</button>
        </div>
      </div>
    </nav>
  )
}