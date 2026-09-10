// Reglas de negocio de auditoría e ingresos del día. Factory con
// repos + puerto clock inyectados.
import { ApiError } from "../lib/ApiError.js";

export function crearAuditoriaService({ auditoriaRepo, facturasRepo, clock }) {
  async function listar(rawLimit) {
    const limit = Math.min(parseInt(rawLimit ?? "100", 10) || 100, 500);
    const filas = await auditoriaRepo.list(limit);
    return filas.map((it) => ({
      id_auditoria: it.id_auditoria,
      fecha_hora: it.fecha_hora,
      empleado: it.empleados
        ? `${it.empleados.nombres} ${it.empleados.apellidos}`
        : "Sistema",
      accion: it.accion,
      tabla_afectada: it.tabla_afectada,
      id_registro_afectado: it.id_registro_afectado,
      descripcion: it.descripcion,
      producto: it.productos?.nombre_producto ?? null,
    }));
  }

  async function registrar(body, actorId) {
    const { accion, tabla_afectada, id_registro_afectado, descripcion } = body;
    if (!accion?.trim())
      throw ApiError.badRequest("El campo accion es requerido");

    return auditoriaRepo.insert({
      idEmpleado: actorId ?? null,
      accion: accion.trim(),
      tabla: tabla_afectada || null,
      idRegistro: id_registro_afectado || null,
      descripcion: descripcion || null,
    });
  }

  async function ingresosHoy() {
    const hoy = clock.hoyColombia();
    const facturas = await facturasRepo.totalesDelDia(hoy);
    const ingresos = facturas.reduce(
      (t, f) => t + (Number(f.total_neto) || 0),
      0,
    );
    const total = facturas.length;
    return {
      fecha: hoy,
      ingresos_totales: ingresos,
      total_ventas: total,
      promedio_venta: total > 0 ? ingresos / total : 0,
      facturas,
    };
  }

  return { listar, registrar, ingresosHoy };
}
