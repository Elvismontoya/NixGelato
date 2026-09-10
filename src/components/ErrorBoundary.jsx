import { Component } from "react";

// Captura errores de render de cualquier página y muestra una pantalla
// de recuperación en vez de dejar el árbol en blanco.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="d-flex justify-content-center align-items-center p-4"
        style={{ minHeight: "100vh" }}
      >
        <div
          className="card card-soft shadow-sm text-center"
          style={{ maxWidth: 460 }}
        >
          <div className="card-body p-5">
            <div style={{ fontSize: "3rem" }}>🍦💥</div>
            <h4 className="fw-bold mt-3 mb-2">Algo salió mal</h4>
            <p className="text-muted mb-4">
              Ocurrió un error inesperado en la aplicación. Puedes recargar la
              página para continuar.
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <button className="btn btn-brand" onClick={this.handleReload}>
                Recargar
              </button>
              <a className="btn btn-outline-secondary" href="/">
                Ir al inicio
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
