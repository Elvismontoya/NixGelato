import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estadoStock } from '../../src/domain/inventario.js'

test('estadoStock', () => {
  assert.equal(estadoStock(0, 5), 'agotado')
  assert.equal(estadoStock(-2, 5), 'agotado')
  assert.equal(estadoStock(5, 5), 'bajo')
  assert.equal(estadoStock(3, 5), 'bajo')
  assert.equal(estadoStock(6, 5), 'normal')
})
