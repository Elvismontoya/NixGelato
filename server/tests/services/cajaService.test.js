import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearCajaService } from '../../services/cajaService.js'

const clockFijo = { hoyColombia: () => '2026-06-15', ahoraISO: () => '2026-06-15T12:00:00.000Z' }
const auditoriaNoop = { log: () => {} }

function make(cajaRepo = {}) {
  return crearCajaService({ clock: clockFijo, auditoriaRepo: auditoriaNoop, cajaRepo })
}

test('abrir: monto negativo → 400', async () => {
  await assert.rejects(() => make().abrir({ monto_apertura: -1 }, 1), { status: 400 })
})

test('abrir: ya existe apertura hoy → 409', async () => {
  const svc = make({ ultimaAperturaPorFecha: async () => ({ id_apertura: 1, estado: 'abierta' }) })
  await assert.rejects(() => svc.abrir({ monto_apertura: 1000 }, 1), {
    status: 409, message: 'La caja de hoy ya fue abierta',
  })
})

test('abrir: carrera (índice único) → 409', async () => {
  const svc = make({
    ultimaAperturaPorFecha: async () => null,
    insertApertura: async () => ({ conflict: true }),
  })
  await assert.rejects(() => svc.abrir({ monto_apertura: 1000 }, 1), { status: 409 })
})

test('abrir OK: inserta con la fecha del clock', async () => {
  let insertado
  const svc = make({
    ultimaAperturaPorFecha: async () => null,
    insertApertura: async (f) => { insertado = f; return { row: { id_apertura: 42, ...f } } },
  })
  const row = await svc.abrir({ monto_apertura: 5000, observaciones: '  billetes  ' }, 9)
  assert.equal(row.id_apertura, 42)
  assert.equal(insertado.fecha, '2026-06-15')
  assert.equal(insertado.fecha_hora_apertura, '2026-06-15T12:00:00.000Z')
  assert.equal(insertado.observaciones_apertura, 'billetes')
  assert.equal(insertado.id_empleado, 9)
})

test('cerrar: apertura inexistente → 404', async () => {
  const svc = make({ findApertura: async () => null })
  await assert.rejects(() => svc.cerrar({ id_apertura: 1, monto_cierre: 100 }, 1), { status: 404 })
})

test('cerrar: ya cerrada → 400', async () => {
  const svc = make({ findApertura: async () => ({ id_apertura: 1, fecha: '2026-06-15', monto_apertura: 5000, estado: 'cerrada' }) })
  await assert.rejects(() => svc.cerrar({ id_apertura: 1, monto_cierre: 100 }, 1), { status: 400 })
})

test('cerrar OK: calcula diferencia con ventas en efectivo del día', async () => {
  let patch
  const svc = make({
    findApertura: async () => ({ id_apertura: 1, fecha: '2026-06-15', monto_apertura: 5000, estado: 'abierta' }),
    facturasDelDiaConPagos: async () => ([
      { anulada: false, facturas_pagos: [{ monto_pagado: 10000, metodos_pago: { nombre_metodo: 'Efectivo' } }] },
      { anulada: false, facturas_pagos: [{ monto_pagado: 3000, metodos_pago: { nombre_metodo: 'Transferencia' } }] },
    ]),
    cerrarSiAbierta: async (_id, p) => { patch = p; return { id_apertura: 1, ...p } },
  })
  // esperado = 5000 + 10000 = 15000 ; contado 15500 → sobrante 500
  const { resumen } = await svc.cerrar({ id_apertura: 1, monto_cierre: 15500 }, 3)
  assert.equal(resumen.total_ventas_efectivo, 10000)
  assert.equal(resumen.monto_esperado, 15000)
  assert.equal(resumen.diferencia, 500)
  assert.equal(resumen.estado, 'sobrante')
  assert.equal(patch.estado, 'cerrada')
  assert.equal(patch.diferencia, 500)
})

test('cerrar: si otro cerró en medio (update 0 filas) → 409', async () => {
  const svc = make({
    findApertura: async () => ({ id_apertura: 1, fecha: '2026-06-15', monto_apertura: 5000, estado: 'abierta' }),
    facturasDelDiaConPagos: async () => [],
    cerrarSiAbierta: async () => null,
  })
  await assert.rejects(() => svc.cerrar({ id_apertura: 1, monto_cierre: 5000 }, 1), { status: 409 })
})
