import { test } from 'node:test'
import assert from 'node:assert/strict'
import { money } from '../../src/domain/money.js'

test('money: formatea COP sin decimales visibles para enteros', () => {
  const s = money(15000)
  assert.match(s, /15\.000/)
  assert.match(s, /\$/)
})

test('money: null/undefined/NaN → 0', () => {
  assert.equal(money(null), money(0))
  assert.equal(money(undefined), money(0))
  assert.equal(money('abc'), money(0))
})
