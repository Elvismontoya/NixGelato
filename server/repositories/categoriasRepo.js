// Acceso a datos de `categorias`.
import { supabaseAdmin } from "../db/supabase.js";

export async function listActive() {
  const { data, error } = await supabaseAdmin
    .from("categorias")
    .select("*")
    .eq("activo", true)
    .order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function findActiveById(id) {
  const { data, error } = await supabaseAdmin
    .from("categorias")
    .select("id_categoria")
    .eq("id_categoria", id)
    .eq("activo", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findById(id) {
  const { data, error } = await supabaseAdmin
    .from("categorias")
    .select("id_categoria, nombre")
    .eq("id_categoria", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insert({ nombre, descripcion }) {
  const { data, error } = await supabaseAdmin
    .from("categorias")
    .insert([{ nombre, descripcion, activo: true }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function update(id, fields) {
  const { data, error } = await supabaseAdmin
    .from("categorias")
    .update({ ...fields, fecha_actualizacion: new Date().toISOString() })
    .eq("id_categoria", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDelete(id) {
  const { error } = await supabaseAdmin
    .from("categorias")
    .update({ activo: false, fecha_actualizacion: new Date().toISOString() })
    .eq("id_categoria", id);
  if (error) throw error;
}

export async function countActiveProductos(idCategoria) {
  const { count, error } = await supabaseAdmin
    .from("productos")
    .select("id_producto", { count: "exact", head: true })
    .eq("id_categoria", idCategoria)
    .eq("activo", true);
  if (error) throw error;
  return count ?? 0;
}

export async function clearCategoriaFromProductos(idCategoria) {
  const { error } = await supabaseAdmin
    .from("productos")
    .update({ id_categoria: null })
    .eq("id_categoria", idCategoria)
    .eq("activo", true);
  if (error) throw error;
}
