// server/routes/caja.js
import express from 'express'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken, requireAdmin, requireRoles } from '../authMiddleware.js'

const router = express.Router()

// Zona horaria Colombia
const COL_TZ = 'America/Bogota'

function fechaHoyCol() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

// ── GET /api/caja/estado ───────────────────────────────────
// Devuelve la apertura de hoy si existe (abierta o cerrada)
router.get('/estado', verifyToken, requireRoles('admin', 'cajero'), async (_req, res) => {
  try {
    const hoy = fechaHoyCol()
    const { data, error } = await supabaseAdmin
      .from('aperturas_caja')
      .select(`
        id_apertura, fecha, monto_apertura, monto_cierre,
        total_ventas_efectivo, diferencia, estado,
        observaciones_apertura, observaciones_cierre,
        fecha_hora_apertura, fecha_hora_cierre,
        empleados:empleados!aperturas_caja_id_empleado_fkey(nombres, apellidos)
      `)
      .eq('fecha', hoy)
      .order('id_apertura', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    res.json({ fecha: hoy, apertura: data ?? null })
  } catch (err) {
    console.error('GET /caja/estado:', err.message)
    res.status(500).json({ message: 'Error al consultar estado de caja' })
  }
})

// ── GET /api/caja/historial ────────────────────────────────
router.get('/historial', verifyToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '30', 10), 90)
    const { data, error } = await supabaseAdmin
      .from('aperturas_caja')
      .select(`
        id_apertura, fecha, monto_apertura, monto_cierre,
        total_ventas_efectivo, diferencia, estado,
        fecha_hora_apertura, fecha_hora_cierre,
        empleados:empleados!aperturas_caja_id_empleado_fkey(nombres, apellidos)
      `)
      .order('fecha', { ascending: false })
      .limit(limit)

    if (error) throw error
    res.json(data ?? [])
  } catch (err) {
    console.error('GET /caja/historial:', err.message)
    res.status(500).json({ message: 'Error al obtener historial de caja' })
  }
})

// ── POST /api/caja/apertura ────────────────────────────────
router.post('/apertura', verifyToken, requireRoles('admin', 'cajero'), async (req, res) => {
  const { monto_apertura, observaciones } = req.body
  const monto = Number(monto_apertura)

  if (isNaN(monto) || monto < 0) {
    return res.status(400).json({ message: 'El monto de apertura debe ser un número >= 0' })
  }

  try {
    const hoy = fechaHoyCol()

    // Verificar que no haya apertura abierta hoy
    const { data: existing } = await supabaseAdmin
      .from('aperturas_caja')
      .select('id_apertura, estado')
      .eq('fecha', hoy)
      .eq('estado', 'abierta')
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ message: 'Ya existe una apertura de caja abierta para hoy' })
    }

    const { data: apertura, error } = await supabaseAdmin
      .from('aperturas_caja')
      .insert([{
        id_empleado:           req.user.id_empleado,
        fecha:                 hoy,
        monto_apertura:        monto,
        estado:                'abierta',
        observaciones_apertura: observaciones?.trim() || null,
        fecha_hora_apertura:   new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw error

    // Auditoría
    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'INSERT',
      tabla_afectada: 'aperturas_caja',
      id_registro_afectado: String(apertura.id_apertura),
      descripcion: `Apertura de caja: $${monto.toLocaleString('es-CO')} - Fecha: ${hoy}`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.status(201).json({ message: 'Caja abierta correctamente', apertura })
  } catch (err) {
    console.error('POST /caja/apertura:', err.message)
    res.status(500).json({ message: 'Error al registrar apertura de caja' })
  }
})

// ── POST /api/caja/cierre ──────────────────────────────────
router.post('/cierre', verifyToken, requireAdmin, async (req, res) => {
  const { id_apertura, monto_cierre, observaciones } = req.body
  const montoCierre = Number(monto_cierre)

  if (!id_apertura) return res.status(400).json({ message: 'id_apertura es requerido' })
  if (isNaN(montoCierre) || montoCierre < 0) {
    return res.status(400).json({ message: 'El monto de cierre debe ser un número >= 0' })
  }

  try {
    // Obtener la apertura
    const { data: apertura, error: errAp } = await supabaseAdmin
      .from('aperturas_caja')
      .select('id_apertura, fecha, monto_apertura, estado')
      .eq('id_apertura', id_apertura)
      .single()

    if (errAp || !apertura) return res.status(404).json({ message: 'Apertura no encontrada' })
    if (apertura.estado === 'cerrada') return res.status(400).json({ message: 'Esta caja ya está cerrada' })

    // Calcular ventas en efectivo del día
    const hoy = apertura.fecha
    const { data: facturas, error: errFact } = await supabaseAdmin
      .from('facturas')
      .select(`
        total_neto, fecha_hora,
        facturas_pagos:facturas_pagos(
          monto_pagado,
          metodos_pago:metodos_pago!facturas_pagos_id_metodo_fkey(nombre_metodo)
        )
      `)
      .gte('fecha_hora', `${hoy}T00:00:00`)
      .lte('fecha_hora', `${hoy}T23:59:59`)

    if (errFact) throw errFact

    // Solo contar pagos en efectivo
    let totalEfectivo = 0
    for (const f of facturas ?? []) {
      for (const p of f.facturas_pagos ?? []) {
        if (p.metodos_pago?.nombre_metodo?.toLowerCase() === 'efectivo') {
          totalEfectivo += Number(p.monto_pagado) || 0
        }
      }
    }

    const diferencia = montoCierre - (Number(apertura.monto_apertura) + totalEfectivo)

    const { data: cierreFinal, error: errCierre } = await supabaseAdmin
      .from('aperturas_caja')
      .update({
        monto_cierre:           montoCierre,
        total_ventas_efectivo:  totalEfectivo,
        diferencia:             diferencia,
        estado:                 'cerrada',
        observaciones_cierre:   observaciones?.trim() || null,
        fecha_hora_cierre:      new Date().toISOString(),
      })
      .eq('id_apertura', id_apertura)
      .select()
      .single()

    if (errCierre) throw errCierre

    // Auditoría
    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'UPDATE',
      tabla_afectada: 'aperturas_caja',
      id_registro_afectado: String(id_apertura),
      descripcion: `Cierre de caja. Monto: $${montoCierre.toLocaleString('es-CO')} | Ventas efectivo: $${totalEfectivo.toLocaleString('es-CO')} | Diferencia: $${diferencia.toLocaleString('es-CO')}`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.json({
      message: 'Caja cerrada correctamente',
      resumen: {
        monto_apertura:        Number(apertura.monto_apertura),
        total_ventas_efectivo: totalEfectivo,
        monto_esperado:        Number(apertura.monto_apertura) + totalEfectivo,
        monto_cierre:          montoCierre,
        diferencia,
        estado: diferencia === 0 ? 'exacto' : diferencia > 0 ? 'sobrante' : 'faltante',
      },
      cierre: cierreFinal,
    })
  } catch (err) {
    console.error('POST /caja/cierre:', err.message)
    res.status(500).json({ message: 'Error al registrar cierre de caja' })
  }
})

export default router