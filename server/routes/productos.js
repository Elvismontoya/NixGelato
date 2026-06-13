import express from 'express'
import { supabaseAdmin } from '../db/supabase.js'
import { verifyToken, requireAdmin } from '../authMiddleware.js'

const router = express.Router()

// ── GET /api/productos ────────────────────────────────────
router.get('/', verifyToken, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('productos')
      .select(`
        id_producto, nombre_producto, precio_venta_unitario,
        img, permite_toppings, activo, id_categoria,
        categorias:categorias!productos_id_categoria_fkey(id_categoria, nombre, descripcion),
        inventario:inventario!inventario_id_producto_fkey(stock_actual)
      `)
      .eq('activo', true)
      .order('id_categoria', { ascending: true })

    if (error) throw error

    const porCategoria = {}
    for (const p of data ?? []) {
      const catId     = p.categorias?.id_categoria ?? 0
      const catNombre = p.categorias?.nombre        ?? 'Sin categoría'
      if (!porCategoria[catId]) {
        porCategoria[catId] = { id: catId, nombre: catNombre, productos: [] }
      }
      porCategoria[catId].productos.push({
        id:              p.id_producto,
        nombre:          p.nombre_producto,
        precio:          Number(p.precio_venta_unitario),
        img:             p.img || '',
        permiteToppings: !!p.permite_toppings,
        stock:           p.inventario?.stock_actual ?? 0,
        id_categoria:    catId,
      })
    }

    res.json(Object.values(porCategoria))
  } catch (err) {
    console.error('GET /productos:', err.message)
    res.status(500).json({ message: 'Error al obtener productos' })
  }
})

// ── POST /api/productos ───────────────────────────────────
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { nombre, precio, stock, img, permiteToppings, id_categoria } = req.body

  if (!nombre?.trim() || precio == null) {
    return res.status(400).json({ message: 'Nombre y precio son obligatorios' })
  }
  if (Number(precio) < 0) {
    return res.status(400).json({ message: 'El precio no puede ser negativo' })
  }

  try {
    if (id_categoria) {
      const { data: cat, error: catError } = await supabaseAdmin
        .from('categorias').select('id_categoria').eq('id_categoria', id_categoria).eq('activo', true).single()
      if (catError || !cat) return res.status(400).json({ message: 'Categoría no válida' })
    }

    const { data: nuevoProd, error: errProd } = await supabaseAdmin
      .from('productos')
      .insert([{
        nombre_producto:        nombre.trim(),
        precio_venta_unitario:  precio,
        img:                    img || null,
        permite_toppings:       !!permiteToppings,
        id_categoria:           id_categoria || null,
        activo:                 true,
      }])
      .select('id_producto')
      .single()

    if (errProd || !nuevoProd) throw errProd || new Error('Error creando producto')

    const { error: errInv } = await supabaseAdmin
      .from('inventario')
      .insert([{
        id_producto:          nuevoProd.id_producto,
        stock_actual:         stock ?? 0,
        stock_minimo:         0,
        ultima_actualizacion: new Date().toISOString(),
      }])
    if (errInv) console.error('Error inventario inicial:', errInv.message)

    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'INSERT',
      tabla_afectada: 'productos',
      id_registro_afectado: String(nuevoProd.id_producto),
      id_producto: nuevoProd.id_producto,
      descripcion: `Producto creado: ${nombre.trim()}`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.status(201).json({ message: 'Producto creado', id: nuevoProd.id_producto })
  } catch (err) {
    console.error('POST /productos:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── PUT /api/productos/:id ────────────────────────────────
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { nombre, precio, stock, img, permiteToppings, id_categoria } = req.body

  if (!nombre?.trim() || precio == null) {
    return res.status(400).json({ message: 'Nombre y precio son obligatorios' })
  }

  try {
    if (id_categoria) {
      const { data: cat, error: catError } = await supabaseAdmin
        .from('categorias').select('id_categoria').eq('id_categoria', id_categoria).eq('activo', true).single()
      if (catError || !cat) return res.status(400).json({ message: 'Categoría no válida' })
    }

    const { error: errUpdProd } = await supabaseAdmin
      .from('productos')
      .update({
        nombre_producto:        nombre.trim(),
        precio_venta_unitario:  precio,
        img:                    img || null,
        permite_toppings:       !!permiteToppings,
        id_categoria:           id_categoria || null,
        fecha_actualizacion:    new Date().toISOString(),
      })
      .eq('id_producto', id)

    if (errUpdProd) throw errUpdProd

    if (stock != null) {
      const { error: errUpdInv } = await supabaseAdmin
        .from('inventario')
        .update({ stock_actual: stock, ultima_actualizacion: new Date().toISOString() })
        .eq('id_producto', id)

      if (errUpdInv) {
        await supabaseAdmin.from('inventario').insert([{
          id_producto: id, stock_actual: stock, stock_minimo: 0,
          ultima_actualizacion: new Date().toISOString(),
        }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })
      }
    }

    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'UPDATE',
      tabla_afectada: 'productos',
      id_registro_afectado: id,
      id_producto: Number(id),
      descripcion: `Producto actualizado: ${nombre.trim()}`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.json({ message: 'Producto actualizado' })
  } catch (err) {
    console.error('PUT /productos/:id:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── DELETE /api/productos/:id ─────────────────────────────
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const { count: facturasCount, error: facturasErr } = await supabaseAdmin
      .from('productos_facturas')
      .select('id_detalle', { count: 'exact', head: true })
      .eq('id_producto', id)

    if (facturasErr) throw facturasErr

    if ((facturasCount ?? 0) > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar: el producto tiene ventas registradas. Desactívalo desde Inventario.',
      })
    }

    const { data: producto, error: errorProducto } = await supabaseAdmin
      .from('productos').select('id_producto, nombre_producto').eq('id_producto', id).single()
    if (errorProducto || !producto) return res.status(404).json({ message: 'Producto no encontrado' })

    const { error: errorDelete } = await supabaseAdmin
      .from('productos').delete().eq('id_producto', id)
    if (errorDelete) throw errorDelete

    await supabaseAdmin.from('auditoria').insert([{
      id_empleado: req.user.id_empleado,
      accion: 'DELETE',
      tabla_afectada: 'productos',
      id_registro_afectado: id,
      id_producto: Number(id),
      descripcion: `Producto eliminado: ${producto.nombre_producto}`,
    }]).then(({ error }) => { if (error) console.error("Auditoría:", error.message) })

    res.json({ message: 'Producto eliminado correctamente', producto: producto.nombre_producto })
  } catch (err) {
    console.error('DELETE /productos/:id:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// ── GET /api/productos/:id/ventas ─────────────────────────
// Historial de ventas de un producto (para el panel admin)
router.get('/:id/ventas', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { fecha_desde, fecha_hasta } = req.query

  try {
    const { data: producto, error: errProd } = await supabaseAdmin
      .from('productos')
      .select('id_producto, nombre_producto, precio_venta_unitario')
      .eq('id_producto', id)
      .single()

    if (errProd || !producto) return res.status(404).json({ message: 'Producto no encontrado' })

    let query = supabaseAdmin
      .from('productos_facturas')
      .select(`
        cantidad, subtotal_linea, precio_unitario_venta,
        facturas:facturas!productos_facturas_id_factura_fkey(id_factura, fecha_hora)
      `)
      .eq('id_producto', id)

    const { data: ventas, error: errVentas } = await query
    if (errVentas) throw errVentas

    let filtradas = ventas ?? []
    if (fecha_desde) filtradas = filtradas.filter(v => v.facturas?.fecha_hora >= `${fecha_desde}T00:00:00`)
    if (fecha_hasta) filtradas = filtradas.filter(v => v.facturas?.fecha_hora <= `${fecha_hasta}T23:59:59`)

    // Agrupar por día
    const porDia = {}
    let totalUnidades = 0
    let totalIngresos = 0

    for (const v of filtradas) {
      const fecha = (v.facturas?.fecha_hora || '').split('T')[0]
      if (!porDia[fecha]) porDia[fecha] = { fecha, unidades: 0, ingresos: 0, ventas: 0 }
      porDia[fecha].unidades  += v.cantidad
      porDia[fecha].ingresos  += Number(v.subtotal_linea)
      porDia[fecha].ventas    += 1
      totalUnidades += v.cantidad
      totalIngresos += Number(v.subtotal_linea)
    }

    res.json({
      producto: {
        id_producto: producto.id_producto,
        nombre: producto.nombre_producto,
        precio: Number(producto.precio_venta_unitario),
      },
      resumen: {
        total_unidades: totalUnidades,
        total_ingresos: totalIngresos,
        total_ventas: filtradas.length,
      },
      por_dia: Object.values(porDia).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    })
  } catch (err) {
    console.error('GET /productos/:id/ventas:', err.message)
    res.status(500).json({ message: 'Error al obtener historial de ventas' })
  }
})

export default router