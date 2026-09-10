import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularCierre, totalEfectivo } from '../../domain/caja.js'

test('calcularCierre: cuadre exacto', () => {
  const r = calcularCierre({ montoApertura: 5000, ventasEfectivo: 10000, montoContado: 15000 })
  assert.equal(r.monto_esperado, 15000)
  assert.equal(r.diferencia, 0)
  assert.equal(r.estado, 'exacto')
})

test('calcularCierre: sobrante', () => {
  const r = calcularCierre({ montoApertura: 5000, ventasEfectivo: 10000, montoContado: 15500 })
  assert.equal(r.diferencia, 500)
  assert.equal(r.estado, 'sobrante')
})

test('calcularCierre: faltante', () => {
  const r = calcularCierre({ montoApertura: 5000, ventasEfectivo: 10000, montoContado: 14000 })
  assert.equal(r.diferencia, -1000)
  assert.equal(r.estado, 'faltante')
})

test('calcularCierre: normaliza valores no numéricos a 0', () => {
  const r = calcularCierre({ montoApertura: null, ventasEfectivo: undefined, montoContado: '2000' })
  assert.equal(r.monto_esperado, 0)
  assert.equal(r.diferencia, 2000)
})

test('totalEfectivo: suma sólo pagos en efectivo de facturas no anuladas', () => {
  const facturas = [
    { anulada: false, facturas_pagos: [
      { monto_pagado: 3000, metodos_pago: { nombre_metodo: 'Efectivo' } },
      { monto_pagado: 2000, metodos_pago: { nombre_metodo: 'Transferencia' } },
    ] },
    { anulada: true, facturas_pagos: [
      { monto_pagado: 9999, metodos_pago: { nombre_metodo: 'Efectivo' } },
    ] },
    { anulada: false, facturas_pagos: [
      { monto_pagado: 1500, metodos_pago: { nombre_metodo: 'EFECTIVO' } },
    ] },
  ]
  assert.equal(totalEfectivo(facturas), 4500)
})

test('totalEfectivo: lista vacía → 0', () => {
  assert.equal(totalEfectivo(), 0)
  assert.equal(totalEfectivo([]), 0)
})
