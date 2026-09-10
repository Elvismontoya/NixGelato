import { useEffect, useState } from "react";
import { getConfig, actualizarConfig } from "../../api/config.js";

const CAMPOS = [
  { name: "nombre", label: "Nombre del negocio", type: "text" },
  { name: "nit", label: "NIT", type: "text" },
  { name: "direccion", label: "Dirección", type: "text" },
  { name: "telefono", label: "Teléfono", type: "text" },
  { name: "regimen", label: "Régimen", type: "text" },
  { name: "iva_porcentaje", label: "IVA (%)", type: "number" },
  { name: "pie_ticket", label: "Pie del ticket", type: "text" },
];

// Pestaña de configuración del negocio. Carga y guarda /api/config.
export default function NegocioTab() {
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "muted" });

  useEffect(() => {
    getConfig()
      .then((cfg) => setForm(cfg))
      .catch(() =>
        setMsg({ text: "No se pudo cargar la configuración", type: "danger" }),
      )
      .finally(() => setCargando(false));
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setMsg({ text: "Guardando...", type: "muted" });
    try {
      const body = Object.fromEntries(
        CAMPOS.map((c) => [c.name, form[c.name]]),
      );
      const { config } = await actualizarConfig(body);
      setForm(config);
      setMsg({ text: "Configuración guardada", type: "success" });
    } catch (err) {
      setMsg({ text: err.message || "Error al guardar", type: "danger" });
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-brand" role="status" />
      </div>
    );
  }
  if (!form) {
    return (
      <div className="alert alert-danger">
        {msg.text || "Sin configuración"}
      </div>
    );
  }

  return (
    <div className="row g-4 fade-in">
      <div className="col-lg-6">
        <div className="card card-soft h-100">
          <div className="card-body">
            <h5 className="mb-1">Datos del negocio</h5>
            <p className="text-muted small mb-3">
              Se usan en el recibo térmico (documento equivalente). El IVA se
              aplica al desglose del ticket.
            </p>

            <form onSubmit={onSubmit}>
              {CAMPOS.map((c) => (
                <div className="mb-3" key={c.name}>
                  <label className="form-label">{c.label}</label>
                  <input
                    type={c.type}
                    className="form-control"
                    name={c.name}
                    value={form[c.name] ?? ""}
                    onChange={onChange}
                    {...(c.type === "number"
                      ? { min: 0, max: 100, step: "0.5" }
                      : {})}
                  />
                </div>
              ))}

              <button
                type="submit"
                className="btn btn-brand"
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Guardando...
                  </>
                ) : (
                  "Guardar configuración"
                )}
              </button>

              {msg.text && (
                <p className={`small mt-3 mb-0 text-${msg.type}`}>{msg.text}</p>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card card-soft h-100">
          <div className="card-body">
            <h6 className="fw-bold mb-3">
              Vista previa de la cabecera del ticket
            </h6>
            <div
              className="p-3 rounded text-center"
              style={{
                background: "var(--bg-soft, #f8f9fa)",
                fontFamily: "monospace",
              }}
            >
              <div style={{ fontSize: "1.6rem" }}>🍨</div>
              <div className="fw-bold">{form.nombre}</div>
              {form.nit && <div className="small">NIT: {form.nit}</div>}
              {form.direccion && <div className="small">{form.direccion}</div>}
              {form.telefono && (
                <div className="small">Tel: {form.telefono}</div>
              )}
              {form.regimen && (
                <div className="small fw-semibold">{form.regimen}</div>
              )}
              <hr />
              <div className="small">IVA aplicado: {form.iva_porcentaje}%</div>
              <div className="small text-muted">{form.pie_ticket}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
