import express from 'express'
import bcrypt  from 'bcrypt'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken, requireAdmin } from '../authMiddleware.js'

const router = express.Router()

// ── GET /api/empleados ─────────────────────────────────────
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page   = Math.max(parseInt(req.query.page  ?? '1',  10), 1)
    const limit  = Math.min(Math.max(parseInt(req.query.limit ?? '50', 10), 1), 100)
    const from   = (page - 1) * limit
    const to     = from + limit - 1
    const search = (req.query.search ?? '').trim()

    let query = supabaseAdmin
      .from('empleados')
      .select(`
        id_empleado, nombres, apellidos, documento, telefono,
        usuario_login, activo, fecha_creacion,
        roles:roles!empleados_id_rol_fkey(nombre_rol)
      `, { count: 'exact' })
      .eq('activo', true)
      .order('nombres', { ascending: true })
      .range(from, to)

    if (search) {
      query = query.or(
        `nombres.ilike.%${search}%,apellidos.ilike.%${search}%,usuario_login.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query
    if (error) throw error

    res.json({
      page, limit,
      total: count ?? data.length,
      data: (data ?? []).map((emp) => ({
        id_empleado:   emp.id_empleado,
        nombres:       emp.nombres,
        apellidos:     emp.apellidos,
        documento:     emp.documento,
        telefono:      emp.telefono,
        usuario_login: emp.usuario_login,
        rol:           emp.roles?.nombre_rol ?? null,
        activo:        emp.activo,
        fecha_creacion: emp.fecha_creacion,
      })),
    })
  } catch (err) {
    console.error('GET /empleados:', err.message)
    res.status(500).json({ message: 'Error al obtener empleados' })
  }
})

// ── GET /api/empleados/:id ─────────────────────────────────
router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const { data: emp, error } = await supabaseAdmin
      .from('empleados')
      .select('id_empleado, nombres, apellidos, documento, telefono, usuario_login, activo, fecha_creacion, roles:roles!empleados_id_rol_fkey(nombre_rol)')
      .eq('id_empleado', id)
      .single()

    if (error || !emp) return res.status(404).json({ message: 'Empleado no encontrado' })

    res.json({
      id_empleado:   emp.id_empleado,
      nombres:       emp.nombres,
      apellidos:     emp.apellidos,
      documento:     emp.documento,
      telefono:      emp.telefono,
      usuario_login: emp.usuario_login,
      rol:           emp.roles?.nombre_rol ?? null,
      activo:        emp.activo,
      fecha_creacion: emp.fecha_creacion,
    })
  } catch (err) {
    console.error('GET /empleados/:id:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── POST /api/empleados ────────────────────────────────────
// Admin crea cajero (o cualquier rol)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { nombres, apellidos, documento, telefono, usuario, password, rol } = req.body

  if (!nombres?.trim() || !apellidos?.trim() || !usuario?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'Nombre, apellido, usuario y contraseña son obligatorios' })
  }

  const rolDestino = (rol || 'cajero').toLowerCase()

  try {
    // Verificar que el usuario no esté tomado
    const { data: existente } = await supabaseAdmin
      .from('empleados').select('id_empleado').eq('usuario_login', usuario.trim()).maybeSingle()
    if (existente) return res.status(400).json({ message: 'El nombre de usuario ya está en uso' })

    // Obtener id_rol
    const { data: rolData, error: rolErr } = await supabaseAdmin
      .from('roles').select('id_rol').eq('nombre_rol', rolDestino).single()
    if (rolErr || !rolData) return res.status(400).json({ message: `Rol "${rolDestino}" no encontrado` })

    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    const hashed = await bcrypt.hash(password.trim(), rounds)

    const { data: nuevoEmp, error: insErr } = await supabaseAdmin
      .from('empleados')
      .insert([{
        nombres:       nombres.trim(),
        apellidos:     apellidos.trim(),
        documento:     documento?.trim() || null,
        telefono:      telefono?.trim()  || null,
        usuario_login: usuario.trim(),
        password_hash: hashed,
        id_rol:        rolData.id_rol,
        activo:        true,
      }])
      .select('id_empleado, usuario_login')
      .single()

    if (insErr || !nuevoEmp) throw insErr || new Error('No se pudo crear el empleado')

    // Auditoría
    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'INSERT',
      tabla_afectada: 'empleados',
      id_registro_afectado: String(nuevoEmp.id_empleado),
      descripcion: `Empleado creado: ${nombres.trim()} ${apellidos.trim()} (${rolDestino})`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.status(201).json({ message: 'Empleado creado correctamente', id_empleado: nuevoEmp.id_empleado })
  } catch (err) {
    console.error('POST /empleados:', err.message)
    res.status(500).json({ message: err.message || 'Error interno del servidor' })
  }
})

// ── PUT /api/empleados/:id ─────────────────────────────────
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { nombres, apellidos, documento, telefono, usuario, rol } = req.body

  if (!nombres?.trim() || !apellidos?.trim() || !usuario?.trim()) {
    return res.status(400).json({ message: 'Nombre, apellido y usuario son obligatorios' })
  }

  try {
    // Verificar que el usuario no esté tomado por OTRO empleado
    const { data: existente } = await supabaseAdmin
      .from('empleados')
      .select('id_empleado')
      .eq('usuario_login', usuario.trim())
      .neq('id_empleado', id)
      .maybeSingle()
    if (existente) return res.status(400).json({ message: 'El nombre de usuario ya está en uso' })

    const updateData = {
      nombres:       nombres.trim(),
      apellidos:     apellidos.trim(),
      documento:     documento?.trim() || null,
      telefono:      telefono?.trim()  || null,
      usuario_login: usuario.trim(),
    }

    if (rol) {
      const { data: rolData, error: rolErr } = await supabaseAdmin
        .from('roles').select('id_rol').eq('nombre_rol', rol.toLowerCase()).single()
      if (rolErr || !rolData) return res.status(400).json({ message: `Rol "${rol}" no encontrado` })
      updateData.id_rol = rolData.id_rol
    }

    const { error } = await supabaseAdmin
      .from('empleados').update(updateData).eq('id_empleado', id)
    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'UPDATE',
      tabla_afectada: 'empleados',
      id_registro_afectado: id,
      descripcion: `Empleado actualizado: ${nombres.trim()} ${apellidos.trim()}`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.json({ message: 'Empleado actualizado correctamente' })
  } catch (err) {
    console.error('PUT /empleados/:id:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── PATCH /api/empleados/:id/password ─────────────────────
router.patch('/:id/password', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { password } = req.body
  if (!password?.trim() || password.trim().length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    const hashed = await bcrypt.hash(password.trim(), rounds)
    const { error } = await supabaseAdmin
      .from('empleados').update({ password_hash: hashed }).eq('id_empleado', id)
    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'UPDATE',
      tabla_afectada: 'empleados',
      id_registro_afectado: id,
      descripcion: `Contraseña cambiada para empleado ID ${id}`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (err) {
    console.error('PATCH /empleados/:id/password:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── DELETE /api/empleados/:id  (soft delete) ──────────────
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params

  // No puede desactivarse a sí mismo
  if (String(req.user.id_empleado) === String(id)) {
    return res.status(400).json({ message: 'No puedes desactivar tu propio usuario' })
  }

  try {
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from('empleados').select('id_empleado, nombres, apellidos').eq('id_empleado', id).single()
    if (errEmp || !emp) return res.status(404).json({ message: 'Empleado no encontrado' })

    const { error } = await supabaseAdmin
      .from('empleados').update({ activo: false }).eq('id_empleado', id)
    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'DELETE',
      tabla_afectada: 'empleados',
      id_registro_afectado: id,
      descripcion: `Empleado desactivado: ${emp.nombres} ${emp.apellidos}`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.json({ message: 'Empleado desactivado correctamente' })
  } catch (err) {
    console.error('DELETE /empleados/:id:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── GET /api/empleados/roles/lista ────────────────────────
router.get('/roles/lista', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('roles').select('id_rol, nombre_rol, descripcion').eq('activo', true).order('nombre_rol')
    if (error) throw error
    res.json(data ?? [])
  } catch (err) {
    console.error('GET /empleados/roles/lista:', err.message)
    res.status(500).json({ message: 'Error al obtener roles' })
  }
})

export default router