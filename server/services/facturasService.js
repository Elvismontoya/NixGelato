// Reglas de negocio de facturas / ventas. Factory con repos inyectados.
// Clasificación de errores y normalización de items → domain/venta.js.
import { ApiError } from '../lib/ApiError.js'
import { formatoCOP } from '../domain/dinero.js'
import { esErrorNegocioVenta, traducirErrorVenta, normalizarItems } from '../domain/venta.js'

function mapFacturaResumen(f) {
  return {
    id_factura:       f.id_factura,
    fecha_hora:       f.fecha_hora,
    empleado_nombres: f.empleados ? `${f.empleados.nombres} ${f.empleados.apellidos}` : null,
    total_bruto:      Number(f.total_bruto),
    descuento_total:  Number(f.descuento_total),
    total_neto:       Number(f.total_neto),
    total_iva:        Number(f.total_iva) || 0,
    total_base:       Number(f.total_base) || 0,
    observaciones:    f.observaciones,
    anulada:          !!f.anulada,
    fecha_anulacion:  f.fecha_anulacion,
    motivo_anulacion: f.motivo_anulacion,
  }
}

export function crearFacturasService({ facturasRepo, metodosPagoRepo, auditoriaRepo }) {
  async function registrarVenta(body, actorId) {
    const { cliente, metodo_pago, productos } = body

    // Orden de validación igual que antes: productos primero, luego método.
    const { items, valido, motivo } = normalizarItems(productos)
    if (!valido) throw ApiError.badRequest(traducirErrorVenta(motivo))
    if (!metodo_pago) throw ApiError.badRequest('Debe seleccionar un método de pago.')

    let data
    try {
      data = await facturasRepo.registrarVenta({
        idEmpleado: actorId, cliente, metodoPago: metodo_pago, items,
      })
    } catch (err) {
      if (esErrorNegocioVenta(err.message)) {
        throw ApiError.badRequest(traducirErrorVenta(err.message))
      }
      console.error('registrarVenta (rpc):', err.message)
      throw new Error('Error interno al registrar la factura.')
    }

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'INSERT', tabla: 'facturas',
      idRegistro: data?.id_factura,
      descripcion: `Venta #${data?.id_factura} registrada. Total: ${formatoCOP(data?.total)}`,
    })

    return {
      id_factura: data?.id_factura,
      total:      data?.total,
      total_iva:  data?.total_iva ?? 0,
      total_base: data?.total_base ?? 0,
    }
  }

  async function ingresosPorDia({ fecha_desde, fecha_hasta }) {
    const facturas = await facturasRepo.ingresosPorDia({ fechaDesde: fecha_desde, fechaHasta: fecha_hasta })
    const porDia = {}
    for (const f of facturas) {
      const fecha = new Date(f.fecha_hora).toISOString().split('T')[0]
      if (!porDia[fecha]) porDia[fecha] = { fecha, ingresos_totales: 0, total_ventas: 0 }
      porDia[fecha].ingresos_totales += Number(f.total_neto) || 0
      porDia[fecha].total_ventas++
    }
    return Object.values(porDia)
      .map((it) => ({
        fecha:            it.fecha,
        ingresos_totales: it.ingresos_totales,
        total_ventas:     it.total_ventas,
        promedio_venta:   it.total_ventas > 0 ? it.ingresos_totales / it.total_ventas : 0,
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }

  async function listar({ fecha_desde, fecha_hasta, id_empleado }) {
    const facturas = await facturasRepo.list({
      fechaDesde: fecha_desde, fechaHasta: fecha_hasta, idEmpleado: id_empleado,
    })
    return facturas.map(mapFacturaResumen)
  }

  async function detalle(id) {
    const factura = await facturasRepo.findConEmpleado(id)
    if (!factura) throw ApiError.notFound('Factura no encontrada')

    const lineas = await facturasRepo.lineas(id)

    return {
      factura: mapFacturaResumen(factura),
      productos: lineas.map((p) => ({
        id_producto:           p.id_producto,
        nombre_producto:       p.productos?.nombre_producto,
        cantidad:              p.cantidad,
        precio_unitario_venta: Number(p.precio_unitario_venta),
        subtotal_linea:        Number(p.subtotal_linea),
        tarifa_iva:            p.tarifa_iva == null ? 19 : Number(p.tarifa_iva),
        iva_linea:             Number(p.iva_linea) || 0,
        toppings:              Array.isArray(p.toppings) ? p.toppings : [],
      })),
    }
  }

  function metodosPago() {
    return metodosPagoRepo.listActive()
  }

  async function anular(id, motivo, actorId) {
    if (!motivo?.trim()) {
      throw ApiError.badRequest('Debes indicar un motivo para anular la venta.')
    }

    let data
    try {
      // Reversión de stock + marca de anulada en una única transacción (RPC).
      data = await facturasRepo.anularVenta({ idFactura: id, motivo, idEmpleado: actorId })
    } catch (err) {
      const m = err.message || ''
      if (m.startsWith('FACTURA_NO_EXISTE')) throw ApiError.notFound('Factura no encontrada')
      if (m.startsWith('YA_ANULADA'))        throw ApiError.badRequest('Esta venta ya fue anulada')
      if (m.startsWith('MOTIVO_REQUERIDO'))  throw ApiError.badRequest('Debes indicar un motivo para anular la venta.')
      throw err
    }

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'DELETE', tabla: 'facturas', idRegistro: id,
      descripcion: `Venta #${id} anulada. Motivo: ${motivo.trim()}. Total revertido: ${formatoCOP(data.total_neto)}. Stock restaurado.`,
    })
  }

  return { registrarVenta, ingresosPorDia, listar, detalle, metodosPago, anular }
}
