// Acceso a datos de `auditoria`.
import { supabaseAdmin } from "../db/supabase.js";

// Registro de auditoría NO bloqueante: nunca hace fallar la operación
// principal; si el insert falla, sólo se loguea.
export function log({
  idEmpleado = null,
  accion,
  tabla = null,
  idRegistro = null,
  descripcion = null,
  idProducto = null,
}) {
  return supabaseAdmin
    .from("auditoria")
    .insert([
      {
        id_empleado: idEmpleado,
        accion,
        tabla_afectada: tabla,
        id_registro_afectado: idRegistro != null ? String(idRegistro) : null,
        descripcion,
        ...(idProducto != null ? { id_producto: idProducto } : {}),
      },
    ])
    .then(({ error }) => {
      if (error) console.error("Auditoría:", error.message);
    })
    .catch((err) => console.error("Auditoría:", err.message));
}

// Insert con retorno (para el endpoint POST /api/auditoria).
export async function insert({
  idEmpleado = null,
  accion,
  tabla = null,
  idRegistro = null,
  descripcion = null,
}) {
  const { data, error } = await supabaseAdmin
    .from("auditoria")
    .insert([
      {
        id_empleado: idEmpleado,
        accion,
        tabla_afectada: tabla,
        id_registro_afectado: idRegistro,
        descripcion,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function list(limit) {
  const { data, error } = await supabaseAdmin
    .from("auditoria")
    .select(
      `
      *,
      empleados:empleados(id_empleado, nombres, apellidos),
      productos:productos(id_producto, nombre_producto)
    `,
    )
    .order("fecha_hora", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
