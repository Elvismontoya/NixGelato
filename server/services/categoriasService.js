// Reglas de negocio de categorías. Factory con repos inyectados.
import { ApiError } from '../lib/ApiError.js'

export function crearCategoriasService({ categoriasRepo, auditoriaRepo }) {
  function listar() {
    return categoriasRepo.listActive()
  }

  async function crear({ nombre, descripcion }) {
    if (!nombre?.trim()) throw ApiError.badRequest('El nombre de la categoría es obligatorio')
    return categoriasRepo.insert({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
    })
  }

  async function actualizar(id, { nombre, descripcion }) {
    if (!nombre?.trim()) throw ApiError.badRequest('El nombre de la categoría es obligatorio')
    return categoriasRepo.update(id, {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
    })
  }

  async function eliminar(id, actorId) {
    const cat = await categoriasRepo.findById(id)
    if (!cat) throw ApiError.notFound('Categoría no encontrada')

    // Pasos no críticos: si fallan, se loguea pero la desactivación continúa.
    let nProductos = 0
    try {
      nProductos = await categoriasRepo.countActiveProductos(id)
    } catch (err) {
      console.error('Error contando productos:', err.message)
    }
    if (nProductos > 0) {
      try {
        await categoriasRepo.clearCategoriaFromProductos(id)
      } catch (err) {
        console.error('Error actualizando productos:', err.message)
      }
    }

    await categoriasRepo.softDelete(id)

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'DELETE', tabla: 'categorias', idRegistro: id,
      descripcion: `Categoría desactivada: ${cat.nombre}. ${nProductos} producto(s) quedaron sin categoría.`,
    })

    return {
      message: `Categoría desactivada correctamente. ${nProductos} producto(s) quedaron sin categoría.`,
      categoria: cat.nombre,
    }
  }

  return { listar, crear, actualizar, eliminar }
}
