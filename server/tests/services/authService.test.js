import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearAuthService } from '../../services/authService.js'

// Dobles: no hay Supabase, bcrypt ni jwt reales.
const hasherFake = {
  hash:    async (p) => `hash:${p.trim()}`,
  compare: async (p, h) => h === `hash:${p.trim()}`,
}
const tokenSignerFake = { sign: (claims) => `token(${claims.rol})` }

function make(overrides = {}) {
  return crearAuthService({
    hasher: hasherFake,
    tokenSigner: tokenSignerFake,
    empleadosRepo: {
      listActiveWithRole: async () => [],
      findByLogin: async () => null,
      findByIdWithRole: async () => null,
      ...overrides.empleadosRepo,
    },
    rolesRepo: { findNameById: async () => 'cajero', ...overrides.rolesRepo },
    authRepo: { crearAdminInicial: async () => ({ id_empleado: 1, usuario_login: 'a' }), ...overrides.authRepo },
  })
}

test('login: credenciales faltantes → 400', async () => {
  await assert.rejects(() => make().login({ usuario: '', password: '' }), { status: 400 })
})

test('login: usuario inexistente → 401', async () => {
  await assert.rejects(
    () => make().login({ usuario: 'x', password: 'y' }),
    { status: 401, message: 'Usuario o contraseña inválidos' }
  )
})

test('login: usuario inactivo → 403', async () => {
  const svc = make({ empleadosRepo: {
    findByLogin: async () => ({ id_empleado: 1, usuario_login: 'x', password_hash: 'hash:secret42', id_rol: 2, activo: false }),
  } })
  await assert.rejects(() => svc.login({ usuario: 'x', password: 'secret42' }), { status: 403 })
})

test('login: password incorrecta → 401', async () => {
  const svc = make({ empleadosRepo: {
    findByLogin: async () => ({ id_empleado: 1, usuario_login: 'x', password_hash: 'hash:otra', id_rol: 2, activo: true }),
  } })
  await assert.rejects(() => svc.login({ usuario: 'x', password: 'secret42' }), { status: 401 })
})

test('login OK: devuelve token y rol en minúscula', async () => {
  const svc = make({
    empleadosRepo: { findByLogin: async () => ({ id_empleado: 7, usuario_login: 'admin', password_hash: 'hash:secret42', id_rol: 1, activo: true }) },
    rolesRepo: { findNameById: async () => 'ADMIN' },
  })
  const r = await svc.login({ usuario: 'admin', password: 'secret42' })
  assert.deepEqual(r, { token: 'token(admin)', rol: 'admin' })
})

test('registerAdmin: password débil → 400 antes de tocar el repo', async () => {
  let llamado = false
  const svc = make({ authRepo: { crearAdminInicial: async () => { llamado = true; return {} } } })
  await assert.rejects(
    () => svc.registerAdmin({ nombres: 'A', apellidos: 'B', usuario: 'c', password: 'abc' }),
    { status: 400 }
  )
  assert.equal(llamado, false)
})

test('registerAdmin: la RPC dice ADMIN_YA_EXISTE → 403', async () => {
  const svc = make({ authRepo: { crearAdminInicial: async () => { throw new Error('ADMIN_YA_EXISTE') } } })
  await assert.rejects(
    () => svc.registerAdmin({ nombres: 'A', apellidos: 'B', usuario: 'c', password: 'abcd1234' }),
    { status: 403 }
  )
})

test('needsInitialAdmin: true si no hay admin activo', async () => {
  assert.equal(await make().needsInitialAdmin(), true)
  const conAdmin = make({ empleadosRepo: { listActiveWithRole: async () => [{ roles: { nombre_rol: 'Admin' } }] } })
  assert.equal(await conAdmin.needsInitialAdmin(), false)
})
