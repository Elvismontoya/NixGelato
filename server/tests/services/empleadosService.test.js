import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearEmpleadosService } from '../../services/empleadosService.js'

const hasherFake = { hash: async (p) => `hash:${p.trim()}` }
const auditoriaNoop = { log: () => {} }

function make(over = {}) {
  return crearEmpleadosService({
    hasher: hasherFake,
    auditoriaRepo: auditoriaNoop,
    empleadosRepo: {
      loginTaken: async () => false,
      insert: async (f) => ({ id_empleado: 100, usuario_login: f.usuario_login }),
      update: async () => {},
      findBasicById: async () => ({ id_empleado: 2, nombres: 'N', apellidos: 'A' }),
      ...over.empleadosRepo,
    },
    rolesRepo: { findIdByName: async () => 2, listActive: async () => [], ...over.rolesRepo },
  })
}

test('crear: campos incompletos → 400', async () => {
  await assert.rejects(() => make().crear({ nombres: 'x' }, 1), { status: 400 })
})

test('crear: password sin números → 400', async () => {
  await assert.rejects(
    () => make().crear({ nombres: 'N', apellidos: 'A', usuario: 'u', password: 'sololetras' }, 1),
    { status: 400, message: /letras y números/ }
  )
})

test('crear: usuario ya en uso → 400', async () => {
  const svc = make({ empleadosRepo: { loginTaken: async () => true } })
  await assert.rejects(
    () => svc.crear({ nombres: 'N', apellidos: 'A', usuario: 'u', password: 'abcd1234' }, 1),
    { status: 400, message: 'El nombre de usuario ya está en uso' }
  )
})

test('crear: rol inexistente → 400', async () => {
  const svc = make({ rolesRepo: { findIdByName: async () => null } })
  await assert.rejects(
    () => svc.crear({ nombres: 'N', apellidos: 'A', usuario: 'u', password: 'abcd1234', rol: 'jefe' }, 1),
    { status: 400, message: 'Rol "jefe" no encontrado' }
  )
})

test('crear OK: hashea y persiste, devuelve id', async () => {
  let insertado
  const svc = make({ empleadosRepo: {
    loginTaken: async () => false,
    insert: async (f) => { insertado = f; return { id_empleado: 55, usuario_login: f.usuario_login } },
  } })
  const r = await svc.crear({ nombres: ' N ', apellidos: ' A ', usuario: ' u ', password: 'abcd1234' }, 9)
  assert.deepEqual(r, { id_empleado: 55 })
  assert.equal(insertado.password_hash, 'hash:abcd1234')
  assert.equal(insertado.usuario_login, 'u')
  assert.equal(insertado.id_rol, 2)
})

test('desactivar: no puedes desactivarte a ti mismo → 400', async () => {
  await assert.rejects(() => make().desactivar('7', 7), { status: 400 })
})

test('desactivar: empleado inexistente → 404', async () => {
  const svc = make({ empleadosRepo: { findBasicById: async () => null } })
  await assert.rejects(() => svc.desactivar('2', 7), { status: 404 })
})
