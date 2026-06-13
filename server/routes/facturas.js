import express from 'express'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken } from '../authMiddleware.js'

const router = express.Router()

// ── POST /api/facturas ─────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  const { cliente, subtotal, total, metodo_pago, productos } = req.body
  const id_empleado = req.user.id_empleado
  const descuento = 0 // Descuentos deshabilitados en el flujo de caja

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ message: 'No hay productos en la venta.' })
  }
  if (subtotal == null || total == null) {
    return res.status(400).json({ message: 'Faltan totales en la venta.' })
  }
  if (!metodo_pago) {
    return res.status(400).json({ message: 'Debe seleccionar un método de pago.' })
  }

  // Validar stock suficiente antes de registrar
  for (const p of productos) {
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('inventario')
      .select('stock_actual')
      .eq('id_producto', p.id)
      .single()

    if (invErr || !inv) {
      return res.status(400).json({ message: `Producto ID ${p.id} no encontrado en inventario.` })
    }
    if (inv.stock_actual < p.cantidad) {
      return res.status(400).json({
        message: `Stock insuficiente para producto ID ${p.id}. Disponible: ${inv.stock_actual}, solicitado: ${p.cantidad}.`,
      })
    }
  }

  try {
    // 1) Factura
    const { data: nuevaFactura, error: errFactura } = await supabaseAdmin
      .from('facturas')
      .insert([{
        fecha_hora:      new Date().toISOString(),
        id_empleado,
        total_bruto:     subtotal,
        descuento_total: descuento || 0,
        total_neto:      total,
        observaciones:   cliente || null,
      }])
      .select('id_factura')
      .single()

    if (errFactura || !nuevaFactura) throw errFactura || new Error('No se pudo crear la factura')

    const facturaId = nuevaFactura.id_factura

    // 2) Detalle
    const { error: errDetalles } = await supabaseAdmin
      .from('productos_facturas')
      .insert(productos.map((p) => ({
        id_factura:             facturaId,
        id_producto:            p.id,
        cantidad:               p.cantidad,
        precio_unitario_venta:  p.precio,
        subtotal_linea:         p.cantidad * p.precio,
      })))
    if (errDetalles) throw errDetalles

    // 3) Actualizar stock
    for (const p of productos) {
      const { error: stockErr } = await supabaseAdmin.rpc('actualizar_stock', {
        id_prod: p.id,
        cantidad_vendida: p.cantidad,
      })
      if (stockErr) console.error(`Stock producto ${p.id}:`, stockErr.message)
    }

    // 4) Pago
    const { data: metodoData } = await supabaseAdmin
      .from('metodos_pago')
      .select('id_metodo')
      .eq('nombre_metodo', metodo_pago)
      .eq('activo', true)
      .single()

    let metodoId = metodoData?.id_metodo
    if (!metodoId) {
      const { data: fallback } = await supabaseAdmin
        .from('metodos_pago').select('id_metodo, nombre_metodo').eq('activo', true).limit(1)
      metodoId = fallback?.[0]?.id_metodo
      if (metodoId) console.warn(`Método "${metodo_pago}" no encontrado, usando fallback`)
    }

    if (metodoId) {
      const { error: errorPago } = await supabaseAdmin
        .from('facturas_pagos')
        .insert([{ id_factura: facturaId, id_metodo: metodoId, monto_pagado: total }])
      if (errorPago) console.error('Error registrando pago:', errorPago.message)
    }

    res.status(201).json({ message: 'Factura registrada con éxito.', id_factura: facturaId })
  } catch (err) {
    console.error('POST /facturas:', err.message)
    res.status(500).json({ message: 'Error interno al registrar la factura.', error: err.message })
  }
})

// ── GET /api/facturas/ingresos-por-dia ────────────────────
router.get('/ingresos-por-dia', verifyToken, async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query
  try {
    let query = supabaseAdmin
      .from('facturas')
      .select('fecha_hora, total_neto')
      .order('fecha_hora', { ascending: true })

    if (fecha_desde) query = query.gte('fecha_hora', `${fecha_desde}T00:00:00`)
    if (fecha_hasta) query = query.lte('fecha_hora', `${fecha_hasta}T23:59:59`)

    const { data: facturas, error } = await query
    if (error) throw error

    const porDia = {}
    for (const f of facturas ?? []) {
      const fecha = new Date(f.fecha_hora).toISOString().split('T')[0]
      if (!porDia[fecha]) porDia[fecha] = { fecha, ingresos_totales: 0, total_ventas: 0 }
      porDia[fecha].ingresos_totales += Number(f.total_neto) || 0
      porDia[fecha].total_ventas++
    }

    res.json(
      Object.values(porDia)
        .map((item) => ({
          fecha:            item.fecha,
          ingresos_totales: item.ingresos_totales,
          total_ventas:     item.total_ventas,
          promedio_venta:   item.total_ventas > 0 ? item.ingresos_totales / item.total_ventas : 0,
        }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    )
  } catch (err) {
    console.error('GET /facturas/ingresos-por-dia:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── GET /api/facturas ──────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  const { fecha_desde, fecha_hasta, id_empleado } = req.query
  try {
    let query = supabaseAdmin
      .from('facturas')
      .select('*, empleados:empleados(nombres, apellidos)')
      .order('fecha_hora', { ascending: false })

    if (fecha_desde) query = query.gte('fecha_hora', `${fecha_desde}T00:00:00`)
    if (fecha_hasta) query = query.lte('fecha_hora', `${fecha_hasta}T23:59:59`)
    if (id_empleado) query = query.eq('id_empleado', id_empleado)

    const { data: facturas, error } = await query
    if (error) throw error

    res.json((facturas ?? []).map((f) => ({
      id_factura:       f.id_factura,
      fecha_hora:       f.fecha_hora,
      empleado_nombres: f.empleados ? `${f.empleados.nombres} ${f.empleados.apellidos}` : null,
      total_bruto:      Number(f.total_bruto),
      descuento_total:  Number(f.descuento_total),
      total_neto:       Number(f.total_neto),
      observaciones:    f.observaciones,
    })))
  } catch (err) {
    console.error('GET /facturas:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── GET /api/facturas/:id/detalle ─────────────────────────
router.get('/:id/detalle', verifyToken, async (req, res) => {
  const { id } = req.params
  try {
    const { data: factura, error: errFactura } = await supabaseAdmin
      .from('facturas')
      .select('*, empleados:empleados(nombres, apellidos)')
      .eq('id_factura', id)
      .single()

    if (errFactura || !factura) return res.status(404).json({ message: 'Factura no encontrada' })

    const { data: productos, error: errProd } = await supabaseAdmin
      .from('productos_facturas')
      .select('*, productos:productos(nombre_producto)')
      .eq('id_factura', id)

    if (errProd) throw errProd

    res.json({
      factura: {
        id_factura:       factura.id_factura,
        fecha_hora:       factura.fecha_hora,
        empleado_nombres: factura.empleados ? `${factura.empleados.nombres} ${factura.empleados.apellidos}` : null,
        total_bruto:      Number(factura.total_bruto),
        descuento_total:  Number(factura.descuento_total),
        total_neto:       Number(factura.total_neto),
        observaciones:    factura.observaciones,
      },
      productos: (productos ?? []).map((p) => ({
        id_producto:           p.id_producto,
        nombre_producto:       p.productos?.nombre_producto,
        cantidad:              p.cantidad,
        precio_unitario_venta: Number(p.precio_unitario_venta),
        subtotal_linea:        Number(p.subtotal_linea),
      })),
    })
  } catch (err) {
    console.error('GET /facturas/:id/detalle:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── GET /api/facturas/metodos-pago ────────────────────────
router.get('/metodos-pago', verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('metodos_pago')
      .select('id_metodo, nombre_metodo, descripcion')
      .eq('activo', true)
      .order('nombre_metodo')

    if (error) throw error
    res.json(data ?? [])
  } catch (err) {
    console.error('GET /facturas/metodos-pago:', err.message)
    res.status(500).json({ message: 'Error al obtener métodos de pago' })
  }
})

export default router