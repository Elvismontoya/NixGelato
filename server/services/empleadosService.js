// Reglas de negocio de empleados. Factory con repos + puerto hasher.
import { ApiError } from '../lib/ApiError.js'
import { validarPassword } from '../domain/password.js'

function toDto(emp) {
  return {
    id_empleado:    emp.id_empleado,
    nombres:        emp.nombres,
    apellidos:      emp.apellidos,
    documento:      emp.documento,
    telefono:       emp.telefono,
    usuario_login:  emp.usuario_login,
    rol:            emp.roles?.nombre_rol ?? null,
    activo:         emp.activo,
    fecha_creacion: emp.fecha_creacion,
  }
}

export function crearEmpleadosService({ empleadosRepo, rolesRepo, auditoriaRepo, hasher }) {
  async function listar({ page = 1, limit = 50, search = '' }) {
    const p = Math.max(parseInt(page, 10) || 1, 1)
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100)
    const from = (p - 1) * l
    const { rows, count } = await empleadosRepo.listActivePaged({
      from, to: from + l - 1, search: String(search ?? '').trim(),
    })
    return { page: p, limit: l, total: count, data: rows.map(toDto) }
  }

  async function obtener(id) {
    const emp = await empleadosRepo.findByIdWithRole(id)
    if (!emp) throw ApiError.notFound('Empleado no encontrado')
    return toDto(emp)
  }

  async function crear(body, actorId) {
    const { nombres, apellidos, documento, telefono, usuario, password, rol } = body

    if (!nombres?.trim() || !apellidos?.trim() || !usuario?.trim() || !password?.trim()) {
      throw ApiError.badRequest('Nombre, apellido, usuario y contraseña son obligatorios')
    }
    const errPass = validarPassword(password)
    if (errPass) throw ApiError.badRequest(errPass)

    const rolDestino = (rol || 'cajero').toLowerCase()

    if (await empleadosRepo.loginTaken(usuario.trim())) {
      throw ApiError.badRequest('El nombre de usuario ya está en uso')
    }

    const idRol = await rolesRepo.findIdByName(rolDestino)
    if (!idRol) throw ApiError.badRequest(`Rol "${rolDestino}" no encontrado`)

    const hashed = await hasher.hash(password)

    const nuevo = await empleadosRepo.insert({
      nombres:       nombres.trim(),
      apellidos:     apellidos.trim(),
      documento:     documento?.trim() || null,
      telefono:      telefono?.trim()  || null,
      usuario_login: usuario.trim(),
      password_hash: hashed,
      id_rol:        idRol,
      activo:        true,
    })

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'INSERT', tabla: 'empleados',
      idRegistro: nuevo.id_empleado,
      descripcion: `Empleado creado: ${nombres.trim()} ${apellidos.trim()} (${rolDestino})`,
    })

    return { id_empleado: nuevo.id_empleado }
  }

  async function actualizar(id, body, actorId) {
    const { nombres, apellidos, documento, telefono, usuario, rol } = body

    if (!nombres?.trim() || !apellidos?.trim() || !usuario?.trim()) {
      throw ApiError.badRequest('Nombre, apellido y usuario son obligatorios')
    }

    if (await empleadosRepo.loginTaken(usuario.trim(), id)) {
      throw ApiError.badRequest('El nombre de usuario ya está en uso')
    }

    const fields = {
      nombres:       nombres.trim(),
      apellidos:     apellidos.trim(),
      documento:     documento?.trim() || null,
      telefono:      telefono?.trim()  || null,
      usuario_login: usuario.trim(),
    }

    if (rol) {
      const idRol = await rolesRepo.findIdByName(rol)
      if (!idRol) throw ApiError.badRequest(`Rol "${rol}" no encontrado`)
      fields.id_rol = idRol
    }

    await empleadosRepo.update(id, fields)

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'UPDATE', tabla: 'empleados', idRegistro: id,
      descripcion: `Empleado actualizado: ${nombres.trim()} ${apellidos.trim()}`,
    })
  }

  async function cambiarPassword(id, password, actorId) {
    const errPass = validarPassword(password)
    if (errPass) throw ApiError.badRequest(errPass)

    const hashed = await hasher.hash(password)
    await empleadosRepo.update(id, { password_hash: hashed })

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'UPDATE', tabla: 'empleados', idRegistro: id,
      descripcion: `Contraseña cambiada para empleado ID ${id}`,
    })
  }

  async function desactivar(id, actorId) {
    if (String(actorId) === String(id)) {
      throw ApiError.badRequest('No puedes desactivar tu propio usuario')
    }

    const emp = await empleadosRepo.findBasicById(id)
    if (!emp) throw ApiError.notFound('Empleado no encontrado')

    await empleadosRepo.update(id, { activo: false })

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'DELETE', tabla: 'empleados', idRegistro: id,
      descripcion: `Empleado desactivado: ${emp.nombres} ${emp.apellidos}`,
    })
  }

  function listarRoles() {
    return rolesRepo.listActive()
  }

  return { listar, obtener, crear, actualizar, cambiarPassword, desactivar, listarRoles }
}
