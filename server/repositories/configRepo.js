// Acceso a datos de `configuracion_negocio` (fila única id = 1).
import { supabaseAdmin } from "../db/supabase.js";

export async function get() {
  const { data, error } = await supabaseAdmin
    .from("configuracion_negocio")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function update(fields) {
  const { data, error } = await supabaseAdmin
    .from("configuracion_negocio")
    .update({ ...fields, actualizado_en: new Date().toISOString() })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
