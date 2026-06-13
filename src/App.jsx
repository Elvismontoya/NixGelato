import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'

import Home           from './pages/Home.jsx'
import Login          from './pages/Login.jsx'
import Pedido         from './pages/Pedido.jsx'
import Admin          from './pages/Admin.jsx'
import AdminAuditoria from './pages/AdminAuditoria.jsx'
import AdminFacturas  from './pages/AdminFacturas.jsx'
import Inventario     from './pages/Inventario.jsx'
import Empleados      from './pages/Empleados.jsx'
import Caja           from './pages/Caja.jsx'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
