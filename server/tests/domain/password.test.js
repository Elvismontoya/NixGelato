import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarPassword } from '../../domain/password.js'

test('rechaza contraseñas cortas', () => {
  assert.match(validarPassword('abc123'), /al menos 8/)
})

test('rechaza sin números', () => {
  assert.match(validarPassword('abcdefgh'), /letras y números/)
})

test('rechaza sin letras', () => {
  assert.match(validarPassword('12345678'), /letras y números/)
})

test('acepta una válida', () => {
  assert.equal(validarPassword('abcd1234'), null)
})

test('recorta espacios antes de validar', () => {
  assert.equal(validarPassword('  abcd1234  '), null)
  assert.notEqual(validarPassword('   '), null)
})

test('tolera null/undefined', () => {
  assert.notEqual(validarPassword(null), null)
  assert.notEqual(validarPassword(undefined), null)
})
