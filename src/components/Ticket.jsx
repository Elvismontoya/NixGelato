// Solo es visible al imprimir (@media print) — en pantalla se oculta.
// Cumple con datos mínimos de documento equivalente (régimen responsable de IVA).
import { money } from "../domain/money.js";
import { desglosarVenta, IVA_PORCENTAJE } from "../domain/ticket.js";

// Valores por defecto si aún no se cargó la config del negocio.
const NEGOCIO_DEFAULT = {
  nombre: "NixGelato",
  nit: "",
  direccion: "",
  telefono: "",
  regimen: "Responsable de IVA",
  iva_porcentaje: IVA_PORCENTAJE,
  pie_ticket: "¡Gracias por tu compra!",
};

export default function Ticket({ venta, negocio }) {
  if (!venta) return null;

  const N = { ...NEGOCIO_DEFAULT, ...(negocio || venta.negocio || {}) };
  const {
    id_factura,
    fecha,
    cliente,
    empleado,
    items,
    total,
    metodoPago,
    pago,
    cambio,
  } = venta;

  const tarifaConfig = Number(N.iva_porcentaje) || IVA_PORCENTAJE;
  const {
    base: baseGravable,
    iva: valorIva,
    tarifa,
  } = desglosarVenta(venta, tarifaConfig);
  // `tarifa` viene null cuando el IVA se calculó por producto (posiblemente varias tarifas).
  const etiquetaIva = tarifa == null ? "IVA" : `IVA (${tarifa}%)`;

  return (
    <div className="ticket-print">
      <div className="ticket-header">
        <div className="ticket-logo">🍨</div>
        <h2>{N.nombre}</h2>
        {N.nit && <p className="ticket-sub">NIT: {N.nit}</p>}
        {N.direccion && <p className="ticket-sub">{N.direccion}</p>}
        {N.telefono && <p className="ticket-sub">Tel: {N.telefono}</p>}
        {N.regimen && <p className="ticket-sub ticket-regimen">{N.regimen}</p>}
      </div>

      <div className="ticket-divider" />

      <div className="ticket-doc-title">DOCUMENTO EQUIVALENTE DE VENTA</div>

      <div className="ticket-divider" />

      <div className="ticket-info">
        <div>
          <strong>No.</strong> {id_factura}
        </div>
        <div>
          <strong>Fecha:</strong> {fecha}
        </div>
        {empleado && (
          <div>
            <strong>Atendido por:</strong> {empleado}
          </div>
        )}
        {cliente && (
          <div>
            <strong>Cliente:</strong> {cliente}
          </div>
        )}
      </div>

      <div className="ticket-divider" />

      <table className="ticket-table">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Producto</th>
            <th style={{ textAlign: "center" }}>Cant</th>
            <th style={{ textAlign: "right" }}>Subt.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.nombre}
                {item.toppings?.length > 0 && (
                  <div className="ticket-toppings">
                    + {item.toppings.join(", ")}
                  </div>
                )}
              </td>
              <td style={{ textAlign: "center" }}>{item.cantidad}</td>
              <td style={{ textAlign: "right" }}>{money(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ticket-divider" />

      <div className="ticket-totales">
        <div className="ticket-total-row">
          <span>Subtotal (base)</span>
          <span>{money(baseGravable)}</span>
        </div>
        <div className="ticket-total-row">
          <span>{etiquetaIva}</span>
          <span>{money(valorIva)}</span>
        </div>
        <div className="ticket-total-row ticket-total-grand">
          <span>TOTAL</span>
          <span>{money(total)}</span>
        </div>
        <div className="ticket-total-row">
          <span>Método de pago</span>
          <span>{metodoPago}</span>
        </div>
        {metodoPago === "Efectivo" && (
          <>
            <div className="ticket-total-row">
              <span>Recibido</span>
              <span>{money(pago)}</span>
            </div>
            <div className="ticket-total-row">
              <span>Cambio</span>
              <span>{money(cambio)}</span>
            </div>
          </>
        )}
      </div>

      <div className="ticket-divider" />

      <div className="ticket-legal">
        <p>Este documento es un soporte de la operación de venta.</p>
        <p>Conserve este comprobante.</p>
      </div>

      <div className="ticket-divider" />

      <div className="ticket-footer">
        <p>{N.pie_ticket}</p>
        <p>Vuelve pronto 🍦</p>
      </div>

      <style>{`
        .ticket-print { display: none; }

        @media print {
          /* Ocultar todo lo demás */
          body * { visibility: hidden; }
          .ticket-print, .ticket-print * { visibility: visible; }

          .ticket-print {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            width: 72mm;
            padding: 4mm;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #000;
          }

          .ticket-header { text-align: center; margin-bottom: 4px; }
          .ticket-logo { font-size: 28px; }
          .ticket-header h2 { margin: 2px 0; font-size: 16px; letter-spacing: 1px; }
          .ticket-sub { margin: 0; font-size: 9px; }
          .ticket-regimen { margin-top: 2px; font-weight: bold; font-size: 9px; }

          .ticket-doc-title {
            text-align: center;
            font-weight: bold;
            font-size: 10px;
            letter-spacing: 0.5px;
          }

          .ticket-divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }

          .ticket-info div { margin-bottom: 2px; }

          .ticket-table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .ticket-table th { border-bottom: 1px solid #000; padding-bottom: 2px; }
          .ticket-table td { padding: 2px 0; vertical-align: top; }
          .ticket-toppings { font-size: 9px; color: #444; padding-left: 4px; }

          .ticket-totales { font-size: 11px; }
          .ticket-total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .ticket-total-grand {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 0;
            margin: 4px 0;
          }

          .ticket-legal { text-align: center; font-size: 8px; color: #333; }
          .ticket-legal p { margin: 1px 0; }

          .ticket-footer { text-align: center; font-size: 10px; margin-top: 6px; }
          .ticket-footer p { margin: 2px 0; }

          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
