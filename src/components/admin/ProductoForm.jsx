import FieldError from "../FieldError.jsx";

// Formulario de alta/edición de producto. Presentacional.
export default function ProductoForm({
  form,
  onChange,
  validacion,
  editMode,
  onReset,
  onSubmit,
  msg,
  categorias,
  onGestionarCategorias,
}) {
  const onCampo = (campo) => (e) => {
    onChange(e);
    validacion.limpiarCampo(campo);
  };

  return (
    <div className="col-lg-4">
      <div className="card card-soft h-100">
        <div className="card-body">
          <h5 className="mb-3">
            {editMode ? "Editar producto" : "Nuevo producto"}
          </h5>

          <form onSubmit={onSubmit} className="stagger-children">
            <input type="hidden" name="id" value={form.id} />

            <div className="mb-3">
              <label className="form-label">Nombre del producto</label>
              <input
                type="text"
                className={`form-control ${validacion.errores.nombre ? "is-invalid" : ""}`}
                name="nombre"
                value={form.nombre}
                onChange={onCampo("nombre")}
                required
              />
              <FieldError errores={validacion.errores} campo="nombre" />
            </div>

            <div className="mb-3">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                name="id_categoria"
                value={form.id_categoria}
                onChange={onChange}
              >
                <option value="">Sin categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
              <div className="form-text">
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0"
                  onClick={onGestionarCategorias}
                >
                  Gestionar categorías
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Precio base (COP)</label>
              <input
                type="number"
                className={`form-control ${validacion.errores.precio ? "is-invalid" : ""}`}
                name="precio"
                min="0"
                step="100"
                value={form.precio}
                onChange={onCampo("precio")}
                required
              />
              <FieldError errores={validacion.errores} campo="precio" />
            </div>

            <div className="mb-3">
              <label className="form-label">IVA (%)</label>
              <input
                type="number"
                className="form-control"
                name="tarifa_iva"
                min="0"
                max="100"
                step="0.5"
                value={form.tarifa_iva}
                onChange={onChange}
              />
              <div className="form-text">
                Tarifa del producto. Usa 0 para productos exentos/excluidos.
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Stock inicial / actual</label>
              <input
                type="number"
                className={`form-control ${validacion.errores.stock ? "is-invalid" : ""}`}
                name="stock"
                min="0"
                step="1"
                value={form.stock}
                onChange={onCampo("stock")}
                required
              />
              <FieldError errores={validacion.errores} campo="stock" />
            </div>

            <div className="mb-3">
              <label className="form-label">URL Imagen</label>
              <input
                type="url"
                className="form-control"
                name="img"
                placeholder="https://ejemplo.com/helado.jpg"
                value={form.img}
                onChange={onChange}
              />
              <div className="form-text">
                Usa una URL de imagen válida o déjalo vacío
              </div>
              {form.img.trim() && (
                <div
                  className="mt-2 d-flex align-items-center gap-3 p-2 rounded"
                  style={{ background: "var(--bg-soft, #f8f9fa)" }}
                >
                  <img
                    src={form.img.trim()}
                    alt="Vista previa"
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                    onLoad={(e) => {
                      e.target.style.display = "block";
                      e.target.nextSibling.style.display = "none";
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "block";
                    }}
                  />
                  <span
                    className="small text-danger"
                    style={{ display: "none" }}
                  >
                    ⚠️ No se pudo cargar la imagen desde esta URL
                  </span>
                  <span className="small text-muted">Vista previa</span>
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">¿Permite toppings?</label>
              <select
                className="form-select"
                name="permiteToppings"
                value={form.permiteToppings}
                onChange={onChange}
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>

            <div className="d-grid gap-2">
              <button type="submit" className="btn btn-brand">
                {editMode ? "Actualizar producto" : "Guardar producto"}
              </button>
              {editMode && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onReset}
                >
                  Cancelar edición
                </button>
              )}
            </div>

            {msg.text && (
              <p className={`small mt-3 mb-0 text-${msg.type}`}>{msg.text}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
