// Acceso a datos de `facturas` (y detalle / RPC de venta).
import { supabaseAdmin } from "../db/supabase.js";

// Solo las columnas que consume la capa de servicio (mapFacturaResumen).
// Evita traer/serializar el resto de la fila en cada listado.
const SELECT_RESUMEN = `
  id_factura, fecha_hora, total_bruto, descuento_total, total_neto,
  total_iva, total_base, observaciones, anulada, fecha_anulacion, motivo_anulacion,
  empleados:empleados!facturas_id_empleado_fkey(nombres, apellidos)
`;

// RPC transaccional: registra la venta completa. Si lanza, se propaga un
// Error cuyo `message` es el texto de la RAISE EXCEPTION.
export async function registrarVenta({
  idEmpleado,
  cliente,
  metodoPago,
  items,
}) {
  const { data, error } = await supabaseAdmin.rpc("registrar_venta", {
    p_id_empleado: idEmpleado,
    p_cliente: cliente ?? null,
    p_metodo_pago: metodoPago,
    p_items: items,
  });
  if (error) throw new Error(error.message);
  return data;
}

// RPC transaccional: revierte el stock de todas las líneas y marca la
// factura como anulada, atómicamente. Lanza un Error con el texto de la
// RAISE EXCEPTION (FACTURA_NO_EXISTE, YA_ANULADA, MOTIVO_REQUERIDO).
export async function anularVenta({ idFactura, motivo, idEmpleado }) {
  const { data, error } = await supabaseAdmin.rpc("anular_venta", {
    p_id_factura: idFactura,
    p_motivo: motivo,
    p_id_empleado: idEmpleado,
  });
  if (error) throw new Error(error.message);
  return data; // { total_neto }
}

export async function ingresosPorDia({ fechaDesde, fechaHasta }) {
  let query = supabaseAdmin
    .from("facturas")
    .select("fecha_hora, total_neto")
    .eq("anulada", false)
    .order("fecha_hora", { ascending: true });
  if (fechaDesde) query = query.gte("fecha_hora", `${fechaDesde}T00:00:00`);
  if (fechaHasta) query = query.lte("fecha_hora", `${fechaHasta}T23:59:59`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function list({ fechaDesde, fechaHasta, idEmpleado }) {
  let query = supabaseAdmin
    .from("facturas")
    .select(SELECT_RESUMEN)
    .order("fecha_hora", { ascending: false });
  if (fechaDesde) query = query.gte("fecha_hora", `${fechaDesde}T00:00:00`);
  if (fechaHasta) query = query.lte("fecha_hora", `${fechaHasta}T23:59:59`);
  if (idEmpleado) query = query.eq("id_empleado", idEmpleado);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function findConEmpleado(id) {
  const { data, error } = await supabaseAdmin
    .from("facturas")
    .select(SELECT_RESUMEN)
    .eq("id_factura", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function lineas(idFactura) {
  const { data, error } = await supabaseAdmin
    .from("productos_facturas")
    .select("*, productos:productos(nombre_producto)")
    .eq("id_factura", idFactura);
  if (error) throw error;
  return data ?? [];
}

export async function totalesDelDia(fecha) {
  const { data, error } = await supabaseAdmin
    .from("facturas")
    .select("total_neto, fecha_hora")
    .eq("anulada", false)
    .gte("fecha_hora", `${fecha}T00:00:00`)
    .lte("fecha_hora", `${fecha}T23:59:59`)
    .order("fecha_hora", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
