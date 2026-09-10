// Reglas de negocio de la configuración del negocio.
import { ApiError } from '../lib/ApiError.js'

const CAMPOS = ['nombre', 'nit', 'direccion', 'telefono', 'regimen', 'iva_porcentaje', 'pie_ticket']

export function crearConfigService({ configRepo, auditoriaRepo }) {
  async function obtener() {
    const cfg = await configRepo.get()
    if (!cfg) throw ApiError.notFound('Configuración no encontrada')
    return cfg
  }

  async function actualizar(body, actorId) {
    const fields = {}
    for (const k of CAMPOS) {
      if (body[k] === undefined) continue
      fields[k] = k === 'iva_porcentaje' ? Number(body[k]) : String(body[k]).trim()
    }

    if (!Object.keys(fields).length) {
      throw ApiError.badRequest('No hay campos para actualizar')
    }
    if ('nombre' in fields && !fields.nombre) {
      throw ApiError.badRequest('El nombre del negocio es obligatorio')
    }
    if ('iva_porcentaje' in fields &&
        (!Number.isFinite(fields.iva_porcentaje) || fields.iva_porcentaje < 0 || fields.iva_porcentaje > 100)) {
      throw ApiError.badRequest('El IVA debe ser un porcentaje entre 0 y 100')
    }

    const cfg = await configRepo.update(fields)

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'UPDATE', tabla: 'configuracion_negocio', idRegistro: 1,
      descripcion: `Configuración del negocio actualizada: ${Object.keys(fields).join(', ')}`,
    })

    return cfg
  }

  return { obtener, actualizar }
}
