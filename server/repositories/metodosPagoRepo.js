// Acceso a datos de `metodos_pago`.
import { supabaseAdmin } from '../db/supabase.js'

export async function listActive() {
  const { data, error } = await supabaseAdmin
    .from('metodos_pago')
    .select('id_metodo, nombre_metodo, descripcion')
    .eq('activo', true)
    .order('nombre_metodo')
  if (error) throw error
  return data ?? []
}
