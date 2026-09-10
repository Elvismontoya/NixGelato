// Acceso a datos de `productos`.
import { supabaseAdmin } from '../db/supabase.js'

export async function listActiveWithCategoriaYStock() {
  const { data, error } = await supabaseAdmin
    .from('productos')
    .select(`
      id_producto, nombre_producto, precio_venta_unitario, tarifa_iva,
      img, permite_toppings, activo, id_categoria,
      categorias:categorias!productos_id_categoria_fkey(id_categoria, nombre, descripcion),
      inventario:inventario!inventario_id_producto_fkey(stock_actual)
    `)
    .eq('activo', true)
    .order('id_categoria', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function insert(fields) {
  const { data, error } = await supabaseAdmin
    .from('productos')
    .insert([fields])
    .select('id_producto')
    .single()
  if (error) throw error
  return data
}

export async function update(id, fields) {
  const { error } = await supabaseAdmin
    .from('productos')
    .update(fields)
    .eq('id_producto', id)
  if (error) throw error
}

export async function findById(id) {
  const { data, error } = await supabaseAdmin
    .from('productos')
    .select('id_producto, nombre_producto')
    .eq('id_producto', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function findConPrecio(id) {
  const { data, error } = await supabaseAdmin
    .from('productos')
    .select('id_producto, nombre_producto, precio_venta_unitario')
    .eq('id_producto', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function remove(id) {
  const { error } = await supabaseAdmin.from('productos').delete().eq('id_producto', id)
  if (error) throw error
}

export async function countVentas(idProducto) {
  const { count, error } = await supabaseAdmin
    .from('productos_facturas')
    .select('id_detalle', { count: 'exact', head: true })
    .eq('id_producto', idProducto)
  if (error) throw error
  return count ?? 0
}

export async function ventasDetalle(idProducto) {
  const { data, error } = await supabaseAdmin
    .from('productos_facturas')
    .select(`
      cantidad, subtotal_linea, precio_unitario_venta,
      facturas:facturas!productos_facturas_id_factura_fkey(id_factura, fecha_hora)
    `)
    .eq('id_producto', idProducto)
  if (error) throw error
  return data ?? []
}
