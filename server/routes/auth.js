import express from 'express'
import bcrypt  from 'bcrypt'
import jwt     from 'jsonwebtoken'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken, requireAdmin } from '../authMiddleware.js'

const router = express.Router()

// ── helpers ────────────────────────────────────────────────
function makeToken(emp, rol) {
  return jwt.sign(
    { id_empleado: emp.id_empleado, usuario_login: emp.usuario_login, rol },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

// ── GET /api/auth/check-initial ────────────────────────────
router.get('/check-initial', async (_req, res) => {
  try {
    const { data: empleados, error } = await supabaseAdmin
      .from('empleados')
      .select('id_empleado, activo, roles:roles!empleados_id_rol_fkey(nombre_rol)')
      .eq('activo', true)

    if (error) throw error

    const hayAdmin = empleados?.some(
      (e) => e.roles?.nombre_rol?.toLowerCase() === 'admin'
    )
    res.json({ needsAdmin: !hayAdmin })
  } catch (err) {
    console.error('check-initial:', err.message)
    res.status(500).json({ message: 'Error consultando empleados' })
  }
})

// ── POST /api/auth/register-admin ─────────────────────────
router.post('/register-admin', async (req, res) => {
  const { nombres, apellidos, usuario, password } = req.body
  if (!nombres?.trim() || !apellidos?.trim() || !usuario?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'Campos incompletos' })
  }

  try {
    // ¿ya existe admin activo?
    const { data: empleados, error: errCheck } = await supabaseAdmin
      .from('empleados')
      .select('id_empleado, roles:roles!empleados_id_rol_fkey(nombre_rol)')
      .eq('activo', true)
    if (errCheck) throw errCheck

    if (empleados?.some((e) => e.roles?.nombre_rol?.toLowerCase() === 'admin')) {
      return res.status(403).json({ message: 'Ya existe un administrador registrado.' })
    }

    const { data: rolAdmin, error: rolErr } = await supabaseAdmin
      .from('roles').select('id_rol').eq('nombre_rol', 'admin').single()
    if (rolErr || !rolAdmin) throw new Error('Rol admin no encontrado')

    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    const hashed = await bcrypt.hash(password.trim(), rounds)

    const { data: nuevoEmp, error: insErr } = await supabaseAdmin
      .from('empleados')
      .insert([{
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        usuario_login: usuario.trim(),
        password_hash: hashed,
        id_rol: rolAdmin.id_rol,
        activo: true,
      }])
      .select('id_empleado, usuario_login')
      .single()

    if (insErr || !nuevoEmp) throw insErr || new Error('No se pudo crear el administrador')

    res.json({
      message: 'Administrador creado correctamente',
      token: makeToken(nuevoEmp, 'admin'),
      rol: 'admin',
    })
  } catch (err) {
    console.error('register-admin:', err.message)
    res.status(500).json({ message: err.message || 'Error interno del servidor' })
  }
})

// ── POST /api/auth/login ───────────────────────────────────
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body
  if (!usuario?.trim() || !password?.trim()) {
    return res.status(400).json({ message: 'Faltan credenciales' })
  }

  try {
    const { data: emp, error: errEmp } = await supabaseAdmin
      .from('empleados')
      .select('id_empleado, usuario_login, password_hash, id_rol, activo')
      .eq('usuario_login', usuario.trim())
      .single()

    if (errEmp || !emp) return res.status(401).json({ message: 'Usuario o contraseña inválidos' })
    if (!emp.activo)     return res.status(403).json({ message: 'Usuario inactivo' })

    const ok = await bcrypt.compare(password.trim(), emp.password_hash)
    if (!ok) return res.status(401).json({ message: 'Usuario o contraseña inválidos' })

    const { data: rolData } = await supabaseAdmin
      .from('roles').select('nombre_rol').eq('id_rol', emp.id_rol).single()
    const rol = rolData?.nombre_rol?.toLowerCase() || 'cajero'

    res.json({ message: 'Login exitoso', token: makeToken(emp, rol), rol })
  } catch (err) {
    console.error('login:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── GET /api/auth/me ───────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { data: emp, error } = await supabaseAdmin
      .from('empleados')
      .select('id_empleado, nombres, apellidos, usuario_login, activo, roles:roles!empleados_id_rol_fkey(nombre_rol)')
      .eq('id_empleado', req.user.id_empleado)
      .single()

    if (error || !emp) return res.status(404).json({ message: 'Empleado no encontrado' })
    res.json({
      id_empleado: emp.id_empleado,
      nombres: emp.nombres,
      apellidos: emp.apellidos,
      usuario_login: emp.usuario_login,
      rol: emp.roles?.nombre_rol || req.user.rol,
    })
  } catch (err) {
    console.error('me:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

export default router
