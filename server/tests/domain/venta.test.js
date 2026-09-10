import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esErrorNegocioVenta, traducirErrorVenta, normalizarItems } from '../../domain/venta.js'

test('esErrorNegocioVenta distingue negocio de fallo técnico', () => {
  assert.equal(esErrorNegocioVenta('STOCK_INSUFICIENTE:Cono disp 2 pedido 5'), true)
  assert.equal(esErrorNegocioVenta('METODO_PAGO_INVALIDO:xyz'), true)
  assert.equal(esErrorNegocioVenta('deadlock detected'), false)
  assert.equal(esErrorNegocioVenta(''), false)
})

test('traducirErrorVenta: stock insuficiente con detalle', () => {
  assert.equal(
    traducirErrorVenta('STOCK_INSUFICIENTE:Cono 2 Bolas disp 2 pedido 5'),
    'Stock insuficiente para "Cono 2 Bolas". Disponible: 2, solicitado: 5.'
  )
})

test('traducirErrorVenta: códigos conocidos', () => {
  assert.equal(traducirErrorVenta('SIN_PRODUCTOS'), 'No hay productos en la venta.')
  assert.equal(traducirErrorVenta('METODO_PAGO_INVALIDO:x'), 'El método de pago seleccionado no es válido.')
  assert.equal(traducirErrorVenta('otra cosa'), 'Error al registrar la venta.')
})

test('normalizarItems: acepta id o id_producto y filtra toppings inválidos', () => {
  const { items, valido } = normalizarItems([
    { id: 3, cantidad: 2, toppings: [1, 0, -4, 'x', 5] },
    { id_producto: 7, cantidad: 1 },
  ])
  assert.equal(valido, true)
  assert.deepEqual(items[0], { id_producto: 3, cantidad: 2, toppings: [1, 5] })
  assert.deepEqual(items[1], { id_producto: 7, cantidad: 1, toppings: [] })
})

test('normalizarItems: lista vacía → SIN_PRODUCTOS', () => {
  assert.deepEqual(normalizarItems([]), { items: [], valido: false, motivo: 'SIN_PRODUCTOS' })
})

test('normalizarItems: cantidad o id inválidos → ITEM_INVALIDO', () => {
  const r = normalizarItems([{ id: 3, cantidad: 0 }])
  assert.equal(r.valido, false)
  assert.equal(r.motivo, 'ITEM_INVALIDO')
})
