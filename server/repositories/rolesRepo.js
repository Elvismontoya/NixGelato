// Acceso a datos de `roles`.
import { supabaseAdmin } from "../db/supabase.js";

export async function findNameById(idRol) {
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("nombre_rol")
    .eq("id_rol", idRol)
    .maybeSingle();
  if (error) throw error;
  return data?.nombre_rol ?? null;
}

export async function findIdByName(nombreRol) {
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("id_rol")
    .eq("nombre_rol", String(nombreRol).toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data?.id_rol ?? null;
}

export async function listActive() {
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("id_rol, nombre_rol, descripcion")
    .eq("activo", true)
    .order("nombre_rol");
  if (error) throw error;
  return data ?? [];
}
