// Reglas de negocio de inventario. Factory con repos inyectados.
import { ApiError } from '../lib/ApiError.js'
import { estadoStock, esStockBajo } from '../domain/inventario.js'

const dominioItem = (i) => ({ stockActual: i.stock_actual, stockMinimo: i.stock_minimo })

function toDto(item) {
  return {
    id_producto:          item.id_producto,
    nombre_producto:      item.productos.nombre_producto,
    categoria:            item.productos.categorias?.nombre || 'Sin categoría',
    precio:               Number(item.productos.precio_venta_unitario),
    img:                  item.productos.img || '',
    stock_actual:         item.stock_actual,
    stock_minimo:         item.stock_minimo,
    ultima_actualizacion: item.ultima_actualizacion,
    estado:               estadoStock(dominioItem(item)),
  }
}

export function crearInventarioService({ inventarioRepo, productosRepo, auditoriaRepo }) {
  async function listar() {
    const filas = await inventarioRepo.listConProducto()
    return filas.map(toDto)
  }

  async function alertas() {
    const filas = await inventarioRepo.listConProducto()
    return filas
      .filter((i) => esStockBajo(dominioItem(i)))
      .map((i) => ({
        id_producto:     i.id_producto,
        nombre_producto: i.productos.nombre_producto,
        categoria:       i.productos.categorias?.nombre || 'Sin categoría',
        stock_actual:    i.stock_actual,
        stock_minimo:    i.stock_minimo,
        diferencia:      i.stock_actual - i.stock_minimo,
        estado:          i.stock_actual <= 0 ? 'agotado' : 'bajo',
      }))
  }

  // /bajos: misma lógica que alertas pero sin el campo `estado`.
  async function bajos() {
    const filas = await inventarioRepo.listConProducto()
    return filas
      .filter((i) => esStockBajo(dominioItem(i)))
      .map((i) => ({
        id_producto:     i.id_producto,
        nombre_producto: i.productos.nombre_producto,
        categoria:       i.productos.categorias?.nombre || 'Sin categoría',
        stock_actual:    i.stock_actual,
        stock_minimo:    i.stock_minimo,
        diferencia:      i.stock_actual - i.stock_minimo,
      }))
  }

  async function agotados() {
    const filas = await inventarioRepo.listAgotados()
    return filas.map((i) => ({
      id_producto:     i.id_producto,
      nombre_producto: i.productos.nombre_producto,
      categoria:       i.productos.categorias?.nombre || 'Sin categoría',
      stock_actual:    i.stock_actual,
      stock_minimo:    i.stock_minimo,
    }))
  }

  async function ajustarStock(rawId, body, actorId) {
    const idProducto = Number(rawId)
    const stockActual = Number(body.stock_actual)
    const stockMinimo = Number(body.stock_minimo ?? 0)

    if (!Number.isInteger(idProducto) || idProducto <= 0) {
      throw ApiError.badRequest('ID de producto inválido')
    }
    if (!Number.isFinite(stockActual) || stockActual < 0 ||
        !Number.isFinite(stockMinimo) || stockMinimo < 0) {
      throw ApiError.badRequest('Los valores de stock deben ser números >= 0')
    }

    const prod = await productosRepo.findById(idProducto)
    if (!prod) throw ApiError.notFound('Producto no encontrado')

    const inventario = await inventarioRepo.upsertStock(idProducto, { stockActual, stockMinimo })

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'UPDATE', tabla: 'inventario',
      idRegistro: idProducto, idProducto,
      descripcion: `Stock actualizado: ${inventario.productos.nombre_producto} - Nuevo stock: ${stockActual}`,
    })

    return inventario
  }

  return { listar, alertas, bajos, agotados, ajustarStock }
}
