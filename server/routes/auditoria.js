import express from 'express'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken, requireAdmin } from '../authMiddleware.js'

const router = express.Router()

const COL_TZ = 'America/Bogota'
function fechaHoyCol() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

// ── GET /api/auditoria ─────────────────────────────────────
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '100', 10), 500)
    const { data, error } = await supabaseAdmin
      .from('auditoria')
      .select(`
        *,
        empleados:empleados(id_empleado, nombres, apellidos),
        productos:productos(id_producto, nombre_producto)
      `)
      .order('fecha_hora', { ascending: false })
      .limit(limit)

    if (error) throw error

    res.json((data ?? []).map((item) => ({
      id_auditoria:          item.id_auditoria,
      fecha_hora:            item.fecha_hora,
      empleado:              item.empleados ? `${item.empleados.nombres} ${item.empleados.apellidos}` : 'Sistema',
      accion:                item.accion,
      tabla_afectada:        item.tabla_afectada,
      id_registro_afectado:  item.id_registro_afectado,
      descripcion:           item.descripcion,
      producto:              item.productos?.nombre_producto ?? null,
    })))
  } catch (err) {
    console.error('GET /auditoria:', err.message)
    res.status(500).json({ message: 'Error al obtener auditoría' })
  }
})

// ── POST /api/auditoria ────────────────────────────────────
// Protegido: solo usuarios autenticados pueden registrar
router.post('/', verifyToken, async (req, res) => {
  const { accion, tabla_afectada, id_registro_afectado, descripcion } = req.body
  if (!accion?.trim()) return res.status(400).json({ message: 'El campo accion es requerido' })

  try {
    const { data, error } = await supabaseAdmin
      .from('auditoria')
      .insert([{
        id_empleado:          req.user.id_empleado ?? null,
        accion:               accion.trim(),
        tabla_afectada:       tabla_afectada || null,
        id_registro_afectado: id_registro_afectado || null,
        descripcion:          descripcion || null,
      }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ message: 'Registro creado', data })
  } catch (err) {
    console.error('POST /auditoria:', err.message)
    res.status(500).json({ message: 'Error al crear registro de auditoría' })
  }
})

// ── GET /api/auditoria/ingresos-hoy ───────────────────────
router.get('/ingresos-hoy', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const hoy = fechaHoyCol()
    const { data, error } = await supabaseAdmin
      .from('facturas')
      .select('total_neto, fecha_hora')
      .eq('anulada', false)
      .gte('fecha_hora', `${hoy}T00:00:00`)
      .lte('fecha_hora', `${hoy}T23:59:59`)
      .order('fecha_hora', { ascending: false })

    if (error) throw error

    const ingresosHoy  = (data ?? []).reduce((t, f) => t + (Number(f.total_neto) || 0), 0)
    const totalVentas  = (data ?? []).length

    res.json({
      fecha:            hoy,
      ingresos_totales: ingresosHoy,
      total_ventas:     totalVentas,
      promedio_venta:   totalVentas > 0 ? ingresosHoy / totalVentas : 0,
      facturas:         data ?? [],
    })
  } catch (err) {
    console.error('GET /auditoria/ingresos-hoy:', err.message)
    res.status(500).json({ message: 'Error al obtener ingresos del día' })
  }
})

export default router