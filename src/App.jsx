import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Carga diferida por ruta: cada página es su propio chunk.
const Home           = lazy(() => import('./pages/Home.jsx'))
const Login          = lazy(() => import('./pages/Login.jsx'))
const Pedido         = lazy(() => import('./pages/Pedido.jsx'))
const Admin          = lazy(() => import('./pages/Admin.jsx'))
const AdminAuditoria = lazy(() => import('./pages/AdminAuditoria.jsx'))
const AdminFacturas  = lazy(() => import('./pages/AdminFacturas.jsx'))
const Inventario     = lazy(() => import('./pages/Inventario.jsx'))
const Empleados      = lazy(() => import('./pages/Empleados.jsx'))
const Caja           = lazy(() => import('./pages/Caja.jsx'))

function PageLoader() {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="spinner-border text-brand" role="status">
        <span className="visually-hidden">Cargando…</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Públicas */}
            <Route path="/"      element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Cajero + Admin */}
            <Route path="/pedido" element={
              <ProtectedRoute allowedRoles={['admin', 'cajero']}>
                <Pedido />
              </ProtectedRoute>
            } />
            <Route path="/facturas" element={
              <ProtectedRoute allowedRoles={['admin', 'cajero']}>
                <AdminFacturas />
              </ProtectedRoute>
            } />

            {/* Solo Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/admin/auditoria" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAuditoria />
              </ProtectedRoute>
            } />
            <Route path="/admin/inventario" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Inventario />
              </ProtectedRoute>
            } />
            <Route path="/admin/empleados" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Empleados />
              </ProtectedRoute>
            } />
            <Route path="/admin/caja" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Caja />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
