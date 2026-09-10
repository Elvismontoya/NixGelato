import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import ModalAperturaCaja from "./ModalAperturaCaja.jsx";
import useSessionSync from "../hooks/useSessionSync.jsx";

const getToken = () => localStorage.getItem("token") || "";
const getRol = () => localStorage.getItem("rol") || "";

// Rutas permitidas por rol
const RUTAS_CAJERO = ["/pedido", "/facturas"];

// Rutas donde NO se muestra el modal de caja (la página de caja del admin)
const RUTAS_SIN_MODAL = ["/admin/caja"];

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  useSessionSync();

  const token = getToken();
  const rol = getRol();
  const location = useLocation();

  const [verificando, setVerificando] = useState(true);
  const [cajaAbierta, setCajaAbierta] = useState(false);

  const esAdmin = rol === "admin";
  const esCajero = rol === "cajero";
  const rutaExenta = RUTAS_SIN_MODAL.some((r) =>
    location.pathname.startsWith(r),
  );

  // ── Verificación de caja ────────────────────────────────────
  // IMPORTANTE: todos los hooks se ejecutan SIEMPRE, antes de
  // cualquier `return` condicional (Reglas de Hooks de React).
  useEffect(() => {
    // Sin token o en ruta exenta → no se consulta la caja
    if (!token || rutaExenta) {
      setCajaAbierta(true);
      setVerificando(false);
      return;
    }

    let cancelado = false;
    setVerificando(true);

    async function verificarCaja() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/caja/estado`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (cancelado) return;
        if (!res.ok) {
          setCajaAbierta(true); // Si falla, dejar pasar
        } else {
          const data = await res.json();
          if (cancelado) return;
          setCajaAbierta(data.apertura?.estado === "abierta");
        }
      } catch {
        if (!cancelado) setCajaAbierta(true); // Sin conexión, dejar pasar
      } finally {
        if (!cancelado) setVerificando(false);
      }
    }

    verificarCaja();
    return () => {
      cancelado = true;
    };
  }, [location.pathname, token, rutaExenta]);

  // ── A partir de aquí, returns condicionales (ya sin hooks) ──

  // Sin token → login
  if (!token) return <Navigate to="/login" replace />;

  // Cajero intentando entrar a ruta no permitida → redirigir a pedido
  if (esCajero && !RUTAS_CAJERO.some((r) => location.pathname.startsWith(r))) {
    return <Navigate to="/pedido" replace />;
  }

  // Rol no permitido en esta ruta específica
  if (allowedRoles.length > 0 && !allowedRoles.includes(rol)) {
    return <Navigate to={esAdmin ? "/admin" : "/pedido"} replace />;
  }

  // Mientras verifica
  if (verificando) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-brand mb-3" role="status" />
          <p className="text-muted small">Verificando estado de caja...</p>
        </div>
      </div>
    );
  }

  // Si no hay caja abierta → mostrar modal (aplica a admin y cajero)
  if (!cajaAbierta && !rutaExenta) {
    return (
      <>
        {children}
        <ModalAperturaCaja
          rol={rol}
          onCajaAbierta={() => setCajaAbierta(true)}
        />
      </>
    );
  }

  return children;
}
