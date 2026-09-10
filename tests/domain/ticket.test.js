import { test } from 'node:test'
import assert from 'node:assert/strict'
import { desglosarIVA, desglosarVenta, IVA_PORCENTAJE } from '../../src/domain/ticket.js'

test('desglosarIVA: base + iva === total', () => {
  const total = 11900
  const { base, iva } = desglosarIVA(total)
  assert.ok(Math.abs(base + iva - total) < 1e-6)
  assert.ok(Math.abs(base - 10000) < 1e-6)
  assert.ok(Math.abs(iva - 1900) < 1e-6)
})

test('desglosarIVA: tarifa configurable', () => {
  const { base } = desglosarIVA(105, 5)
  assert.ok(Math.abs(base - 100) < 1e-6)
})

test('desglosarIVA: total 0', () => {
  assert.deepEqual(desglosarIVA(0), { base: 0, iva: 0 })
})

test('IVA_PORCENTAJE es 19', () => {
  assert.equal(IVA_PORCENTAJE, 19)
})

test('desglosarVenta: usa total_iva/total_base de la BD si vienen', () => {
  const r = desglosarVenta({ total: 14600, total_iva: 2331, total_base: 12269 })
  assert.equal(r.iva, 2331)
  assert.equal(r.base, 12269)
  assert.equal(r.tarifa, null) // varias tarifas posibles → sin porcentaje fijo
})

test('desglosarVenta: sin total_iva → cae al cálculo global', () => {
  const r = desglosarVenta({ total: 11900 }, 19)
  assert.ok(Math.abs(r.base - 10000) < 1e-6)
  assert.ok(Math.abs(r.iva - 1900) < 1e-6)
  assert.equal(r.tarifa, 19)
})

test('desglosarVenta: venta 100% exenta (iva 0, base = total) es autoritativa', () => {
  const r = desglosarVenta({ total: 5000, total_iva: 0, total_base: 5000 }, 19)
  assert.equal(r.iva, 0)
  assert.equal(r.base, 5000)
  assert.equal(r.tarifa, null)
})

test('desglosarVenta: factura pre-v10 (base/iva en 0) → cálculo global', () => {
  const r = desglosarVenta({ total_neto: 11900, total_iva: 0, total_base: 0 }, 19)
  assert.ok(Math.abs(r.base - 10000) < 1e-6)
  assert.ok(Math.abs(r.iva - 1900) < 1e-6)
  assert.equal(r.tarifa, 19)
})
