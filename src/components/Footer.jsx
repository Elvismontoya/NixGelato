import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="py-3 mt-4 border-top">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-4 text-center text-md-start mb-3 mb-md-0">
            <Link to="/" className="text-decoration-none fw-bold text-gradient d-flex align-items-center justify-content-center justify-content-md-start">
              <span className="display-6 me-2">🍨</span>
              <span>© {new Date().getFullYear()} NixGelato</span>
            </Link>
          </div>
          <div className="col-md-4 text-center mb-3 mb-md-0">
            <p className="mb-0 text-muted small">Desarrollado por Elvis Montoya y Juan Hernandez</p>
          </div>
          <div className="col-md-4 text-center text-md-end">
            <div className="d-flex justify-content-center justify-content-md-end gap-4">
              <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="text-decoration-none text-muted small">📷 Instagram</a>
              <a href="https://www.facebook.com/"  target="_blank" rel="noreferrer" className="text-decoration-none text-muted small">👥 Facebook</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
