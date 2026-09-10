// Acceso a datos de `empleados`. Sin reglas de negocio: sólo consultas.
import { supabaseAdmin } from '../db/supabase.js'

const SELECT_DETALLE = `
  id_empleado, nombres, apellidos, documento, telefono,
  usuario_login, activo, fecha_creacion,
  roles:roles!empleados_id_rol_fkey(nombre_rol)
`

export async function findByLogin(usuarioLogin) {
  const { data, error } = await supabaseAdmin
    .from('empleados')
    .select('id_empleado, usuario_login, password_hash, id_rol, activo')
    .eq('usuario_login', usuarioLogin)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function findByIdWithRole(idEmpleado) {
  const { data, error } = await supabaseAdmin
    .from('empleados')
    .select(SELECT_DETALLE)
    .eq('id_empleado', idEmpleado)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listActiveWithRole() {
  const { data, error } = await supabaseAdmin
    .from('empleados')
    .select('id_empleado, activo, roles:roles!empleados_id_rol_fkey(nombre_rol)')
    .eq('activo', true)
  if (error) throw error
  return data ?? []
}

export async function listActivePaged({ from, to, search }) {
  let query = supabaseAdmin
    .from('empleados')
    .select(SELECT_DETALLE, { count: 'exact' })
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
  return { rows: data ?? [], count: count ?? (data?.length ?? 0) }
}

export async function findBasicById(idEmpleado) {
  const { data, error } = await supabaseAdmin
    .from('empleados')
    .select('id_empleado, nombres, apellidos')
    .eq('id_empleado', idEmpleado)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function loginTaken(usuarioLogin, exceptId) {
  let query = supabaseAdmin
    .from('empleados')
    .select('id_empleado')
    .eq('usuario_login', usuarioLogin)
  if (exceptId != null) query = query.neq('id_empleado', exceptId)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return !!data
}

export async function insert(fields) {
  const { data, error } = await supabaseAdmin
    .from('empleados')
    .insert([fields])
    .select('id_empleado, usuario_login')
    .single()
  if (error) throw error
  return data
}

export async function update(idEmpleado, fields) {
  const { error } = await supabaseAdmin
    .from('empleados')
    .update(fields)
    .eq('id_empleado', idEmpleado)
  if (error) throw error
}
