import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estadoStock, esStockBajo } from '../../domain/inventario.js'

test('estadoStock: agotado cuando stock <= 0', () => {
  assert.equal(estadoStock({ stockActual: 0, stockMinimo: 5 }), 'agotado')
  assert.equal(estadoStock({ stockActual: -1, stockMinimo: 5 }), 'agotado')
})

test('estadoStock: bajo cuando stock <= mínimo', () => {
  assert.equal(estadoStock({ stockActual: 5, stockMinimo: 5 }), 'bajo')
  assert.equal(estadoStock({ stockActual: 3, stockMinimo: 5 }), 'bajo')
})

test('estadoStock: normal cuando stock > mínimo', () => {
  assert.equal(estadoStock({ stockActual: 6, stockMinimo: 5 }), 'normal')
})

test('esStockBajo', () => {
  assert.equal(esStockBajo({ stockActual: 5, stockMinimo: 5 }), true)
  assert.equal(esStockBajo({ stockActual: 6, stockMinimo: 5 }), false)
})
