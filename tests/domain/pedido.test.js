import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  precioConToppings, totalPedido, calcularCambio, billetesSugeridos, puedeCobrar,
} from '../../src/domain/pedido.js'

test('precioConToppings: base + toppings, redondeado', () => {
  assert.equal(precioConToppings(5000, [800, 500]), 6300)
  assert.equal(precioConToppings(2500.4, [100.2]), 2601)
  assert.equal(precioConToppings(3000, []), 3000)
  assert.equal(precioConToppings(null, [500]), 500)
})

test('totalPedido: suma subtotales de línea', () => {
  assert.equal(totalPedido([{ subtotal: 5800 }, { subtotal: 3000 }]), 8800)
  assert.equal(totalPedido([]), 0)
})

test('calcularCambio: nunca negativo', () => {
  assert.equal(calcularCambio(20000, 14600), 5400)
  assert.equal(calcularCambio(10000, 14600), 0)
})

test('billetesSugeridos: piso = min(total, 1000) — igual que el POS actual', () => {
  const B = [500, 1000, 2000, 5000, 10000]
  // total > 1000 → piso 1000 → descarta sólo el de 500
  assert.deepEqual(billetesSugeridos(6300, B), [1000, 2000, 5000, 10000])
  // total < 1000 → piso = total
  assert.deepEqual(billetesSugeridos(700, B), [1000, 2000, 5000, 10000])
  assert.deepEqual(billetesSugeridos(300, B), [500, 1000, 2000, 5000, 10000])
})

test('puedeCobrar', () => {
  const base = { items: [{}], metodoPago: 'Efectivo', pago: 15000, total: 14600 }
  assert.equal(puedeCobrar(base), true)
  assert.equal(puedeCobrar({ ...base, pago: 10000 }), false)
  assert.equal(puedeCobrar({ ...base, metodoPago: '' }), false)
  assert.equal(puedeCobrar({ ...base, items: [] }), false)
})
