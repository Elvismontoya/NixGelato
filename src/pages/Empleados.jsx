import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar.jsx'
import Footer from '../components/Footer.jsx'
import ModalConfirmar from '../components/ModalConfirmar.jsx'
import { useFormValidation, FieldError } from '../hooks/useFormValidation.jsx'

const getToken = () => localStorage.getItem('token') || ''

const FORM_EMPTY = {
  id: '', nombres: '', apellidos: '', documento: '',
  telefono: '', usuario: '', password: '', rol: 'cajero',
}

export default function Empleados() {
  const navigate = useNavigate()

  const [empleados, setEmpleados] = useState([])
  const [roles,     setRoles]     = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [search,    setSearch]    = useState('')

  const [form,    setForm]    = useState(FORM_EMPTY)
  const [msg,     setMsg]     = useState({ text: '', type: 'muted' })
  const [loading, setLoading] = useState(false)

  // Modal cambiar contraseña
  const [showPassModal, setShowPassModal]   = useState(false)
  const [passEmpId,     setPassEmpId]       = useState(null)
  const [passEmpNombre, setPassEmpNombre]   = useState('')
  const [nuevaPass,     setNuevaPass]       = useState('')
  const [passMsg,       setPassMsg]         = useState({ text: '', type: 'muted' })
  const [passLoading,   setPassLoading]     = useState(false)

  const editMode = useMemo(() => !!form.id, [form.id])

  const [modalDesactivar, setModalDesactivar] = useState(null)
  const [loadingDesactivar, setLoadingDesactivar] = useState(false)

  const validacion = useFormValidation({
    nombres:   { required: 'El nombre es obligatorio' },
    apellidos: { required: 'El apellido es obligatorio' },
    usuario:   { required: 'El usuario es obligatorio', minLength: 3 },
    password:  {
      validate: (v, vals) => {
        if (vals._editMode) return true // en edición no es obligatoria
        if (!v || !v.trim()) return 'La contraseña es obligatoria'
        if (v.trim().length < 6) return 'Mínimo 6 caracteres'
        return true
      }
    },
  })

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    navigate('/login', { replace: true })
  }

  // ── Cargar datos ─────────────────────────────────────────
  async function cargarEmpleados() {
    try {
      setCargando(true)
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/empleados?limit=100`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      if (res.status === 401 || res.status === 403) { logout(); return }
      if (!res.ok) throw new Error('Error cargando empleados')
      const data = await res.json()
      setEmpleados(Array.isArray(data.data) ? data.data : [])
    } catch (err) {
      console.error(err)
      setMsg({ text: 'Error cargando empleados', type: 'danger' })
    } finally {
      setCargando(false)
    }
  }

  async function cargarRoles() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/empleados/roles/lista`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      if (res.ok) {
        const data = await res.json()
        setRoles(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Roles:', err)
    }
  }

  useEffect(() => {
    cargarEmpleados()
    cargarRoles()
  }, [])

  // ── Filtro ────────────────────────────────────────────────
  const empleadosFiltrados = useMemo(() => {
    const q = search.toLowerCase()
    return empleados.filter((e) =>
      !q ||
      e.nombres.toLowerCase().includes(q) ||
      e.apellidos.toLowerCase().includes(q) ||
      e.usuario_login.toLowerCase().includes(q)
    )
  }, [empleados, search])

  // ── Formulario ────────────────────────────────────────────
  function onChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function resetForm() {
    setForm(FORM_EMPTY)
    setMsg({ text: '', type: 'muted' })
  }

  function startEditar(emp) {
    setForm({
      id:        emp.id_empleado,
      nombres:   emp.nombres,
      apellidos: emp.apellidos,
      documento: emp.documento || '',
      telefono:  emp.telefono  || '',
      usuario:   emp.usuario_login,
      password:  '',
      rol:       emp.rol || 'cajero',
    })
    setMsg({ text: '', type: 'muted' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setMsg({ text: 'Guardando...', type: 'muted' })
    setLoading(true)

    const body = {
      nombres:   form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      documento: form.documento.trim(),
      telefono:  form.telefono.trim(),
      usuario:   form.usuario.trim(),
      rol:       form.rol,
    }
    if (!editMode) body.password = form.password.trim()

    // Validación visual con hook
    const valido = validacion.validar({ ...body, password: form.password, _editMode: editMode })
    if (!valido) { setLoading(false); setMsg({ text: '', type: '' }); return }

    try {
      const url    = editMode
        ? `${import.meta.env.VITE_API_URL}/api/empleados/${form.id}`
        : `${import.meta.env.VITE_API_URL}/api/empleados`
      const method = editMode ? 'PUT' : 'POST'

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ text: data.message || 'Error al guardar', type: 'danger' })
        return
      }
      setMsg({ text: editMode ? 'Empleado actualizado' : 'Empleado creado correctamente', type: 'success' })
      resetForm()
      await cargarEmpleados()
    } catch (err) {
      console.error(err)
      setMsg({ text: 'Error al conectar con el servidor', type: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  // ── Desactivar ────────────────────────────────────────────
  function pedirDesactivar(emp) {
    setModalDesactivar({
      id: emp.id_empleado,
      titulo: '¿Desactivar empleado?',
      mensaje: 'No podrá iniciar sesión hasta que sea reactivado.',
      detalle: `${emp.nombres} ${emp.apellidos} (@${emp.usuario_login})`,
      tipo: 'warning',
      txtOk: 'Desactivar',
    })
  }

  async function desactivar(id) {
    setLoadingDesactivar(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/empleados/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ text: data.message || 'Error al desactivar', type: 'danger' }); return }
      setModalDesactivar(null)
      await cargarEmpleados()
    } catch (err) {
      console.error(err)
      setMsg({ text: 'Error al conectar con el servidor', type: 'danger' })
    } finally {
      setLoadingDesactivar(false)
    }
  }

  // ── Cambiar contraseña ────────────────────────────────────
  function abrirModalPass(emp) {
    setPassEmpId(emp.id_empleado)
    setPassEmpNombre(`${emp.nombres} ${emp.apellidos}`)
    setNuevaPass('')
    setPassMsg({ text: '', type: 'muted' })
    setShowPassModal(true)
  }

  async function cambiarPassword(e) {
    e.preventDefault()
    if (!nuevaPass.trim() || nuevaPass.trim().length < 6) {
      setPassMsg({ text: 'La contraseña debe tener al menos 6 caracteres', type: 'danger' })
      return
    }
    setPassLoading(true)
    setPassMsg({ text: 'Guardando...', type: 'muted' })
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/empleados/${passEmpId}/password`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ password: nuevaPass.trim() }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPassMsg({ text: data.message || 'Error al cambiar contraseña', type: 'danger' }); return }
      setPassMsg({ text: 'Contraseña actualizada correctamente', type: 'success' })
      setTimeout(() => setShowPassModal(false), 1200)
    } catch (err) {
      console.error(err)
      setPassMsg({ text: 'Error al conectar con el servidor', type: 'danger' })
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <>
      <AdminNavbar onLogout={logout} />

      <main className="container my-4">
        <section className="hero mb-4 text-center fade-in">
          <h1 className="display-6 fw-bold mb-2">Gestión de Empleados</h1>
          <p className="lead mb-0">Crea, edita y administra los usuarios del sistema.</p>
        </section>

        {/* Stats */}
        <div className="row g-3 mb-4">
          {[
            { label: 'Total empleados', val: empleados.length },
            { label: 'Cajeros', val: empleados.filter(e => e.rol === 'cajero').length },
            { label: 'Administradores', val: empleados.filter(e => e.rol === 'admin').length },
          ].map((s) => (
            <div className="col-md-4" key={s.label}>
              <div className="card card-soft text-center p-3">
                <div className="text-muted small">{s.label}</div>
                <div className="h3 fw-bold text-gradient mt-1">{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4">
          {/* Formulario */}
          <div className="col-lg-4">
            <div className="card card-soft h-100">
              <div className="card-body">
                <h5 className="mb-3">{editMode ? 'Editar empleado' : 'Nuevo empleado'}</h5>
                <form onSubmit={onSubmit}>
                  {[
                    { name: 'nombres',   label: 'Nombres',   type: 'text',  required: true },
                    { name: 'apellidos', label: 'Apellidos', type: 'text',  required: true },
                    { name: 'documento', label: 'Documento', type: 'text',  required: false },
                    { name: 'telefono',  label: 'Teléfono',  type: 'tel',   required: false },
                    { name: 'usuario',   label: 'Usuario',   type: 'text',  required: true },
                  ].map(({ name, label, type, required }) => (
                    <div className="mb-3" key={name}>
                      <label className="form-label">{label}{required && ' *'}</label>
                      <input
                        type={type}
                        className="form-control"
                        name={name}
                        value={form[name]}
                        onChange={onChange}
                        required={required}
                        autoComplete="off"
                      />
                    </div>
                  ))}

                  {!editMode && (
                    <div className="mb-3">
                      <label className="form-label">Contraseña *</label>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={form.password}
                        onChange={onChange}
                        required
                        autoComplete="new-password"
                        minLength={6}
                      />
                      <div className="form-text">Mínimo 6 caracteres</div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Rol *</label>
                    <select className="form-select" name="rol" value={form.rol} onChange={onChange}>
                      {roles.length > 0
                        ? roles.map((r) => (
                          <option key={r.id_rol} value={r.nombre_rol}>{r.nombre_rol}</option>
                        ))
                        : <>
                          <option value="cajero">cajero</option>
                          <option value="admin">admin</option>
                        </>
                      }
                    </select>
                  </div>

                  <div className="d-grid gap-2">
                    <button type="submit" className="btn btn-brand" disabled={loading}>
                      {loading
                        ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
                        : editMode ? 'Actualizar empleado' : 'Crear empleado'
                      }
                    </button>
                    {editMode && (
                      <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
                        Cancelar edición
                      </button>
                    )}
                  </div>

                  {msg.text && (
                    <div className={`alert alert-${msg.type === 'danger' ? 'danger' : msg.type === 'success' ? 'success' : 'secondary'} mt-3 mb-0 py-2`}>
                      {msg.text}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="col-lg-8">
            <div className="card card-soft h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Empleados activos</h5>
                  <span className="badge bg-info">{empleadosFiltrados.length}</span>
                </div>
                <input
                  className="form-control mb-3"
                  placeholder="Buscar por nombre o usuario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="table-responsive">
                  <table className="table align-middle table-hover">
                    <thead>
                      <tr>
                        <th>Empleado</th>
                        <th className="text-center">Rol</th>
                        <th className="text-center">Contacto</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargando ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}><td colSpan={4}><div className="placeholder-wave"><span className="placeholder col-12" /></div></td></tr>
                        ))
                      ) : empleadosFiltrados.length === 0 ? (
                        <tr><td colSpan={4} className="text-center text-muted py-4">No hay empleados{search ? ' con ese filtro' : ''}.</td></tr>
                      ) : (
                        empleadosFiltrados.map((emp) => (
                          <tr key={emp.id_empleado}>
                            <td>
                              <div className="fw-semibold">{emp.nombres} {emp.apellidos}</div>
                              <div className="small text-muted">@{emp.usuario_login}</div>
                            </td>
                            <td className="text-center">
                              <span className={`badge ${emp.rol === 'admin' ? 'bg-danger' : 'bg-info'}`}>
                                {emp.rol || '—'}
                              </span>
                            </td>
                            <td className="text-center small text-muted">
                              {emp.telefono || '—'}
                            </td>
                            <td className="text-end">
                              <div className="d-flex gap-1 justify-content-end flex-nowrap">
                                <button
                                  className="btn btn-sm btn-outline-brand"
                                  onClick={() => startEditar(emp)}
                                  title="Editar datos"
                                >Editar</button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => abrirModalPass(emp)}
                                  title="Cambiar contraseña"
                                >🔑</button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => pedirDesactivar(emp)}
                                  title="Desactivar"
                                >✕</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal cambiar contraseña */}
      {showPassModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title">🔑 Cambiar contraseña</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPassModal(false)} />
                </div>
                <form onSubmit={cambiarPassword}>
                  <div className="modal-body">
                    <p className="text-muted mb-3">Empleado: <strong>{passEmpNombre}</strong></p>
                    <div className="mb-3">
                      <label className="form-label">Nueva contraseña</label>
                      <input
                        type="password"
                        className="form-control"
                        value={nuevaPass}
                        onChange={(e) => setNuevaPass(e.target.value)}
                        minLength={6}
                        required
                        autoFocus
                        autoComplete="new-password"
                      />
                      <div className="form-text">Mínimo 6 caracteres</div>
                    </div>
                    {passMsg.text && (
                      <div className={`alert alert-${passMsg.type === 'danger' ? 'danger' : passMsg.type === 'success' ? 'success' : 'secondary'} py-2 mb-0`}>
                        {passMsg.text}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowPassModal(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-brand" disabled={passLoading}>
                      {passLoading ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</> : 'Guardar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowPassModal(false)} />
        </>
      )}

      <ModalConfirmar
        config={modalDesactivar ? { ...modalDesactivar, loading: loadingDesactivar } : null}
        onConfirm={() => desactivar(modalDesactivar.id)}
        onCancel={() => !loadingDesactivar && setModalDesactivar(null)}
      />

      <Footer />
    </>
  )
}