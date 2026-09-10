// Acceso a datos de `aperturas_caja` (y consulta de efectivo del día).
import { supabaseAdmin } from '../db/supabase.js'

const SELECT_COMPLETO = `
  id_apertura, fecha, monto_apertura, monto_cierre,
  total_ventas_efectivo, diferencia, estado,
  observaciones_apertura, observaciones_cierre,
  fecha_hora_apertura, fecha_hora_cierre,
  id_empleado,
  empleados:empleados!aperturas_caja_id_empleado_fkey(nombres, apellidos)
`

export async function aperturaDelDia(fecha) {
  const { data, error } = await supabaseAdmin
    .from('aperturas_caja')
    .select(SELECT_COMPLETO)
    .eq('fecha', fecha)
    .order('id_apertura', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export async function cajasDelDia(fecha) {
  const { data, error } = await supabaseAdmin
    .from('aperturas_caja')
    .select(SELECT_COMPLETO)
    .eq('fecha', fecha)
    .order('fecha_hora_apertura', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function historial(limit) {
  const { data, error } = await supabaseAdmin
    .from('aperturas_caja')
    .select(`
      id_apertura, fecha, monto_apertura, monto_cierre,
      total_ventas_efectivo, diferencia, estado,
      fecha_hora_apertura, fecha_hora_cierre,
      id_empleado,
      empleados:empleados!aperturas_caja_id_empleado_fkey(nombres, apellidos)
    `)
    .order('fecha', { ascending: false })
    .order('fecha_hora_apertura', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function ultimaAperturaPorFecha(fecha) {
  const { data, error } = await supabaseAdmin
    .from('aperturas_caja')
    .select('id_apertura, estado')
    .eq('fecha', fecha)
    .order('id_apertura', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

// Devuelve { row } o { conflict: true } si el índice único parcial rechaza.
export async function insertApertura(fields) {
  const { data, error } = await supabaseAdmin
    .from('aperturas_caja')
    .insert([fields])
    .select()
    .single()
  if (error?.code === '23505') return { conflict: true }
  if (error) throw error
  return { row: data }
}

export async function findApertura(id) {
  const { data, error } = await supabaseAdmin
    .from('aperturas_caja')
    .select('id_apertura, fecha, monto_apertura, estado, id_empleado')
    .eq('id_apertura', id)
    .maybeSingle()
  if (error) throw error
  return data
}

// Cierre condicionado a estado='abierta'. Devuelve la fila o null si ya estaba cerrada.
export async function cerrarSiAbierta(id, patch) {
  const { data, error } = await supabaseAdmin
    .from('aperturas_caja')
    .update(patch)
    .eq('id_apertura', id)
    .eq('estado', 'abierta')
    .select()
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

// Facturas del día con sus pagos y método, para calcular el efectivo.
export async function facturasDelDiaConPagos(fecha) {
  const { data, error } = await supabaseAdmin
    .from('facturas')
    .select(`
      total_neto, fecha_hora, id_empleado, anulada,
      facturas_pagos:facturas_pagos(
        monto_pagado,
        metodos_pago:metodos_pago!facturas_pagos_id_metodo_fkey(nombre_metodo)
      )
    `)
    .gte('fecha_hora', `${fecha}T00:00:00`)
    .lte('fecha_hora', `${fecha}T23:59:59`)
  if (error) throw error
  return data ?? []
}
