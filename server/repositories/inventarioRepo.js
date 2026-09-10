// Acceso a datos de `inventario`.
import { supabaseAdmin } from "../db/supabase.js";

const SELECT_CON_PRODUCTO = `
  id_producto, stock_actual, stock_minimo, ultima_actualizacion,
  productos:productos!inner(
    id_producto, nombre_producto, precio_venta_unitario, img,
    categorias:categorias!productos_id_categoria_fkey(nombre)
  )
`;

export async function listConProducto() {
  const { data, error } = await supabaseAdmin
    .from("inventario")
    .select(SELECT_CON_PRODUCTO)
    .order("stock_actual", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAgotados() {
  const { data, error } = await supabaseAdmin
    .from("inventario")
    .select(
      `
      id_producto, stock_actual, stock_minimo,
      productos:productos!inner(
        id_producto, nombre_producto,
        categorias:categorias!productos_id_categoria_fkey(nombre)
      )
    `,
    )
    .eq("stock_actual", 0)
    .order("nombre_producto", {
      ascending: true,
      referencedTable: "productos",
    });
  if (error) throw error;
  return data ?? [];
}

export async function insert({ idProducto, stockActual, stockMinimo = 0 }) {
  const { error } = await supabaseAdmin.from("inventario").insert([
    {
      id_producto: idProducto,
      stock_actual: stockActual,
      stock_minimo: stockMinimo,
      ultima_actualizacion: new Date().toISOString(),
    },
  ]);
  if (error) throw error;
}

export async function updateStock(idProducto, { stockActual, stockMinimo }) {
  const patch = { ultima_actualizacion: new Date().toISOString() };
  if (stockActual != null) patch.stock_actual = stockActual;
  if (stockMinimo != null) patch.stock_minimo = stockMinimo;
  const { error, count } = await supabaseAdmin
    .from("inventario")
    .update(patch, { count: "exact" })
    .eq("id_producto", idProducto);
  if (error) throw error;
  return count ?? 0;
}

export async function upsertStock(idProducto, { stockActual, stockMinimo }) {
  const { data, error } = await supabaseAdmin
    .from("inventario")
    .upsert(
      {
        id_producto: idProducto,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        ultima_actualizacion: new Date().toISOString(),
      },
      { onConflict: "id_producto" },
    )
    .select("*, productos:productos!inner(nombre_producto)")
    .single();
  if (error) throw error;
  return data;
}
