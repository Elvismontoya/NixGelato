// Reglas de negocio de productos. Factory con repos inyectados.
import { ApiError } from '../lib/ApiError.js'

// Normaliza y valida una tarifa de IVA (porcentaje 0–100). `undefined` => sin cambio.
function normalizarTarifaIva(valor) {
  if (valor === undefined || valor === null || valor === '') return undefined
  const n = Number(valor)
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw ApiError.badRequest('El IVA del producto debe ser un porcentaje entre 0 y 100')
  }
  return n
}

export function crearProductosService({ productosRepo, categoriasRepo, inventarioRepo, auditoriaRepo }) {
  async function listarAgrupado() {
    const filas = await productosRepo.listActiveWithCategoriaYStock()
    const porCategoria = {}
    for (const p of filas) {
      const catId     = p.categorias?.id_categoria ?? 0
      const catNombre = p.categorias?.nombre        ?? 'Sin categoría'
      if (!porCategoria[catId]) {
        porCategoria[catId] = { id: catId, nombre: catNombre, productos: [] }
      }
      porCategoria[catId].productos.push({
        id:              p.id_producto,
        nombre:          p.nombre_producto,
        precio:          Number(p.precio_venta_unitario),
        tarifaIva:       p.tarifa_iva == null ? 19 : Number(p.tarifa_iva),
        img:             p.img || '',
        permiteToppings: !!p.permite_toppings,
        stock:           p.inventario?.stock_actual ?? 0,
        id_categoria:    catId,
      })
    }
    return Object.values(porCategoria)
  }

  async function validarCategoria(idCategoria) {
    if (!idCategoria) return
    const cat = await categoriasRepo.findActiveById(idCategoria)
    if (!cat) throw ApiError.badRequest('Categoría no válida')
  }

  async function crear(body, actorId) {
    const { nombre, precio, stock, img, permiteToppings, id_categoria } = body
    if (!nombre?.trim() || precio == null) {
      throw ApiError.badRequest('Nombre y precio son obligatorios')
    }
    if (Number(precio) < 0) throw ApiError.badRequest('El precio no puede ser negativo')
    const tarifaIva = normalizarTarifaIva(body.tarifa_iva)
    await validarCategoria(id_categoria)

    const nuevo = await productosRepo.insert({
      nombre_producto:       nombre.trim(),
      precio_venta_unitario: precio,
      tarifa_iva:            tarifaIva ?? 19,
      img:                   img || null,
      permite_toppings:      !!permiteToppings,
      id_categoria:          id_categoria || null,
      activo:                true,
    })

    try {
      await inventarioRepo.insert({ idProducto: nuevo.id_producto, stockActual: stock ?? 0, stockMinimo: 0 })
    } catch (err) {
      console.error('Error inventario inicial:', err.message)
    }

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'INSERT', tabla: 'productos',
      idRegistro: nuevo.id_producto, idProducto: nuevo.id_producto,
      descripcion: `Producto creado: ${nombre.trim()}`,
    })

    return { id: nuevo.id_producto }
  }

  async function actualizar(id, body, actorId) {
    const { nombre, precio, stock, img, permiteToppings, id_categoria } = body
    if (!nombre?.trim() || precio == null) {
      throw ApiError.badRequest('Nombre y precio son obligatorios')
    }
    const tarifaIva = normalizarTarifaIva(body.tarifa_iva)
    await validarCategoria(id_categoria)

    await productosRepo.update(id, {
      nombre_producto:       nombre.trim(),
      precio_venta_unitario: precio,
      ...(tarifaIva === undefined ? {} : { tarifa_iva: tarifaIva }),
      img:                   img || null,
      permite_toppings:      !!permiteToppings,
      id_categoria:          id_categoria || null,
      fecha_actualizacion:   new Date().toISOString(),
    })

    if (stock != null) {
      try {
        const n = await inventarioRepo.updateStock(id, { stockActual: stock })
        if (n === 0) {
          await inventarioRepo.insert({ idProducto: id, stockActual: stock, stockMinimo: 0 })
        }
      } catch (err) {
        console.error('Error actualizando stock del producto:', err.message)
      }
    }

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'UPDATE', tabla: 'productos',
      idRegistro: id, idProducto: Number(id),
      descripcion: `Producto actualizado: ${nombre.trim()}`,
    })
  }

  async function eliminar(id, actorId) {
    if (await productosRepo.countVentas(id) > 0) {
      throw ApiError.badRequest(
        'No se puede eliminar: el producto tiene ventas registradas. Desactívalo desde Inventario.'
      )
    }
    const producto = await productosRepo.findById(id)
    if (!producto) throw ApiError.notFound('Producto no encontrado')

    await productosRepo.remove(id)

    auditoriaRepo.log({
      idEmpleado: actorId, accion: 'DELETE', tabla: 'productos',
      idRegistro: id, idProducto: Number(id),
      descripcion: `Producto eliminado: ${producto.nombre_producto}`,
    })

    return { producto: producto.nombre_producto }
  }

  async function ventas(id, { fecha_desde, fecha_hasta }) {
    const producto = await productosRepo.findConPrecio(id)
    if (!producto) throw ApiError.notFound('Producto no encontrado')

    let filas = await productosRepo.ventasDetalle(id)
    if (fecha_desde) filas = filas.filter((v) => v.facturas?.fecha_hora >= `${fecha_desde}T00:00:00`)
    if (fecha_hasta) filas = filas.filter((v) => v.facturas?.fecha_hora <= `${fecha_hasta}T23:59:59`)

    const porDia = {}
    let totalUnidades = 0
    let totalIngresos = 0
    for (const v of filas) {
      const fecha = (v.facturas?.fecha_hora || '').split('T')[0]
      if (!porDia[fecha]) porDia[fecha] = { fecha, unidades: 0, ingresos: 0, ventas: 0 }
      porDia[fecha].unidades += v.cantidad
      porDia[fecha].ingresos += Number(v.subtotal_linea)
      porDia[fecha].ventas   += 1
      totalUnidades += v.cantidad
      totalIngresos += Number(v.subtotal_linea)
    }

    return {
      producto: {
        id_producto: producto.id_producto,
        nombre: producto.nombre_producto,
        precio: Number(producto.precio_venta_unitario),
      },
      resumen: {
        total_unidades: totalUnidades,
        total_ingresos: totalIngresos,
        total_ventas: filas.length,
      },
      por_dia: Object.values(porDia).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    }
  }

  return { listarAgrupado, crear, actualizar, eliminar, ventas }
}
