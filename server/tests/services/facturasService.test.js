import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearFacturasService } from '../../services/facturasService.js'

const auditoriaNoop = { log: () => {} }

function make(facturasRepo = {}) {
  return crearFacturasService({
    auditoriaRepo: auditoriaNoop,
    metodosPagoRepo: { listActive: async () => [] },
    facturasRepo,
  })
}

test('registrarVenta: sin productos → 400 "No hay productos"', async () => {
  await assert.rejects(
    () => make().registrarVenta({ metodo_pago: 'Efectivo', productos: [] }, 1),
    { status: 400, message: 'No hay productos en la venta.' }
  )
})

test('registrarVenta: item con cantidad 0 → 400 "datos inválidos"', async () => {
  await assert.rejects(
    () => make().registrarVenta({ metodo_pago: 'Efectivo', productos: [{ id: 3, cantidad: 0 }] }, 1),
    { status: 400, message: 'Hay productos con datos inválidos.' }
  )
})

test('registrarVenta: falta método → 400', async () => {
  await assert.rejects(
    () => make().registrarVenta({ productos: [{ id: 3, cantidad: 1 }] }, 1),
    { status: 400, message: 'Debe seleccionar un método de pago.' }
  )
})

test('registrarVenta: la RPC devuelve STOCK_INSUFICIENTE → 400 traducido', async () => {
  const svc = make({
    registrarVenta: async () => { throw new Error('STOCK_INSUFICIENTE:Cono disp 2 pedido 5') },
  })
  await assert.rejects(
    () => svc.registrarVenta({ metodo_pago: 'Efectivo', productos: [{ id: 3, cantidad: 5 }] }, 1),
    { status: 400, message: 'Stock insuficiente para "Cono". Disponible: 2, solicitado: 5.' }
  )
})

test('registrarVenta: fallo técnico de la RPC → error genérico (no 400)', async () => {
  const svc = make({ registrarVenta: async () => { throw new Error('deadlock detected') } })
  await assert.rejects(
    () => svc.registrarVenta({ metodo_pago: 'Efectivo', productos: [{ id: 3, cantidad: 1 }] }, 1),
    (err) => err.status === undefined && /Error interno/.test(err.message)
  )
})

test('registrarVenta OK: pasa items normalizados y devuelve total del servidor', async () => {
  let recibido
  const svc = make({
    registrarVenta: async (arg) => {
      recibido = arg
      return { id_factura: 77, total: 14600, total_iva: 2331, total_base: 12269 }
    },
  })
  const r = await svc.registrarVenta({
    cliente: 'Ana', metodo_pago: 'Efectivo',
    productos: [{ id: 3, cantidad: 2, precio: 999, toppings: [1, 0, 5] }],
  }, 9)
  assert.deepEqual(r, { id_factura: 77, total: 14600, total_iva: 2331, total_base: 12269 })
  assert.deepEqual(recibido.items, [{ id_producto: 3, cantidad: 2, toppings: [1, 5] }])
  assert.equal(recibido.idEmpleado, 9)
  assert.equal(recibido.metodoPago, 'Efectivo')
})

test('anular: sin motivo → 400 (sin tocar la BD)', async () => {
  let llamado = false
  const svc = make({ anularVenta: async () => { llamado = true; return {} } })
  await assert.rejects(() => svc.anular(1, '  ', 9), { status: 400 })
  assert.equal(llamado, false)
})

test('anular: la RPC dice YA_ANULADA → 400', async () => {
  const svc = make({ anularVenta: async () => { throw new Error('YA_ANULADA') } })
  await assert.rejects(() => svc.anular(1, 'error de cobro', 9), { status: 400, message: 'Esta venta ya fue anulada' })
})

test('anular: la RPC dice FACTURA_NO_EXISTE → 404', async () => {
  const svc = make({ anularVenta: async () => { throw new Error('FACTURA_NO_EXISTE') } })
  await assert.rejects(() => svc.anular(999, 'x', 9), { status: 404 })
})

test('anular OK: delega en la RPC transaccional y audita con el total', async () => {
  let recibido
  const svc = make({
    anularVenta: async (arg) => { recibido = arg; return { total_neto: 7000 } },
  })
  await svc.anular(1, ' cliente canceló ', 9)
  assert.deepEqual(recibido, { idFactura: 1, motivo: ' cliente canceló ', idEmpleado: 9 })
})
