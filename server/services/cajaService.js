// Reglas de negocio de caja (modelo: caja compartida, una por día).
// Factory: recibe cajaRepo, auditoriaRepo y el puerto clock por inyección.
import { ApiError } from "../lib/ApiError.js";
import { formatoCOP } from "../domain/dinero.js";
import { calcularCierre, totalEfectivo } from "../domain/caja.js";

export function crearCajaService({ cajaRepo, auditoriaRepo, clock }) {
  async function estado() {
    const hoy = clock.hoyColombia();
    return { fecha: hoy, apertura: await cajaRepo.aperturaDelDia(hoy) };
  }

  async function estadoTodas() {
    const hoy = clock.hoyColombia();
    return { fecha: hoy, cajas: await cajaRepo.cajasDelDia(hoy) };
  }

  function historial(rawLimit) {
    const limit = Math.min(Number.parseInt(rawLimit ?? "60", 10) || 60, 200);
    return cajaRepo.historial(limit);
  }

  async function abrir({ monto_apertura, observaciones }, actorId) {
    const monto = Number(monto_apertura);
    if (Number.isNaN(monto) || monto < 0) {
      throw ApiError.badRequest("El monto de apertura debe ser un número >= 0");
    }

    const hoy = clock.hoyColombia();

    const existente = await cajaRepo.ultimaAperturaPorFecha(hoy);
    if (existente) {
      throw ApiError.conflict(
        existente.estado === "abierta"
          ? "La caja de hoy ya fue abierta"
          : "La caja de hoy ya fue abierta y cerrada. No se puede abrir otra.",
      );
    }

    const { row, conflict } = await cajaRepo.insertApertura({
      id_empleado: actorId,
      fecha: hoy,
      monto_apertura: monto,
      estado: "abierta",
      observaciones_apertura: observaciones?.trim() || null,
      fecha_hora_apertura: clock.ahoraISO(),
    });
    if (conflict) throw ApiError.conflict("La caja de hoy ya fue abierta");

    auditoriaRepo.log({
      idEmpleado: actorId,
      accion: "INSERT",
      tabla: "aperturas_caja",
      idRegistro: row.id_apertura,
      descripcion: `Apertura de caja: ${formatoCOP(monto)} - Fecha: ${hoy}`,
    });

    return row;
  }

  async function cerrar({ id_apertura, monto_cierre, observaciones }, actorId) {
    const montoCierre = Number(monto_cierre);
    if (!id_apertura) throw ApiError.badRequest("id_apertura es requerido");
    if (Number.isNaN(montoCierre) || montoCierre < 0) {
      throw ApiError.badRequest("El monto de cierre debe ser un número >= 0");
    }

    const apertura = await cajaRepo.findApertura(id_apertura);
    if (!apertura) throw ApiError.notFound("Apertura no encontrada");
    if (apertura.estado === "cerrada")
      throw ApiError.badRequest("Esta caja ya está cerrada");

    const facturas = await cajaRepo.facturasDelDiaConPagos(apertura.fecha);
    const ventasEfectivo = totalEfectivo(facturas);

    const resumen = calcularCierre({
      montoApertura: apertura.monto_apertura,
      ventasEfectivo,
      montoContado: montoCierre,
    });

    const cierreFinal = await cajaRepo.cerrarSiAbierta(id_apertura, {
      monto_cierre: resumen.monto_cierre,
      total_ventas_efectivo: resumen.total_ventas_efectivo,
      diferencia: resumen.diferencia,
      estado: "cerrada",
      observaciones_cierre: observaciones?.trim() || null,
      fecha_hora_cierre: clock.ahoraISO(),
    });
    if (!cierreFinal)
      throw ApiError.conflict("Esta caja ya fue cerrada por otro usuario");

    auditoriaRepo.log({
      idEmpleado: actorId,
      accion: "UPDATE",
      tabla: "aperturas_caja",
      idRegistro: id_apertura,
      descripcion: `Cierre de caja. Monto: ${formatoCOP(resumen.monto_cierre)} | Ventas efectivo: ${formatoCOP(resumen.total_ventas_efectivo)} | Diferencia: ${formatoCOP(resumen.diferencia)}`,
    });

    return { resumen, cierre: cierreFinal };
  }

  return { estado, estadoTodas, historial, abrir, cerrar };
}
