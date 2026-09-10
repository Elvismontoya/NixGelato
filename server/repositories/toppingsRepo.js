// Acceso a datos de `toppings`.
import { supabaseAdmin } from "../db/supabase.js";

export async function listActive() {
  const { data, error } = await supabaseAdmin
    .from("toppings")
    .select("id_topping, nombre_topping, precio, activo")
    .eq("activo", true)
    .order("nombre_topping", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
