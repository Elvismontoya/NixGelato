import { useId } from "react";

// Claves estables para las filas de carga (evita usar el índice como key).
const FILAS_CARGA = ["c1", "c2", "c3", "c4"];

// Pestaña de gestión de categorías. Presentacional: el estado del formulario
// y los handlers viven en el contenedor (Admin).
export default function CategoriasTab({
  form,
  onChange,
  onSubmit,
  onReset,
  editMode,
  msg,
  categorias,
  productos,
  loading,
  onStartEditar,
  onPedirEliminar,
}) {
  const uid = useId();
  const contarProductos = (idCat) =>
    productos.filter((p) => String(p.id_categoria) === String(idCat)).length;

  return (
    <div className="row g-4 fade-in">
      {/* Formulario */}
      <div className="col-lg-4">
        <div className="card card-soft h-100">
          <div className="card-body">
            <h5 className="mb-3">
              {editMode ? "Editar categoría" : "Nueva categoría"}
            </h5>

            <form onSubmit={onSubmit} className="stagger-children">
              <input type="hidden" name="id" value={form.id} />

              <div className="mb-3">
                <label className="form-label" htmlFor={`${uid}-nombre`}>
                  Nombre de la categoría
                </label>
                <input
                  id={`${uid}-nombre`}
                  type="text"
                  className="form-control"
                  name="nombre"
                  value={form.nombre}
                  onChange={onChange}
                  placeholder="Ej: Helados, Postres, Bebidas..."
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor={`${uid}-descripcion`}>
                  Descripción (opcional)
                </label>
                <textarea
                  id={`${uid}-descripcion`}
                  className="form-control"
                  name="descripcion"
                  rows="3"
                  value={form.descripcion}
                  onChange={onChange}
                  placeholder="Descripción de la categoría..."
                />
              </div>

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-brand">
                  {editMode ? "Actualizar categoría" : "Crear categoría"}
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

      {/* Lista */}
      <div className="col-lg-8">
        <div className="card card-soft">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Categorías existentes</h5>
              <small className="text-muted">
                Organiza tus productos por categorías
              </small>
            </div>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th className="text-center">Productos</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody className="stagger-children">
                  {loading ? (
                    FILAS_CARGA.map((k) => (
                      <tr key={k}>
                        <td colSpan={4}>
                          <div className="placeholder-wave">
                            <span className="placeholder col-12" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : categorias.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        No hay categorías creadas.
                      </td>
                    </tr>
                  ) : (
                    categorias.map((cat) => (
                      <tr key={cat.id_categoria}>
                        <td>
                          <div className="fw-semibold">{cat.nombre}</div>
                        </td>
                        <td>
                          <div className="text-muted small">
                            {cat.descripcion || "Sin descripción"}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-info">
                            {contarProductos(cat.id_categoria)}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2 flex-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-brand btn-table-action"
                              onClick={() => onStartEditar(cat)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger btn-table-action"
                              onClick={() => onPedirEliminar(cat)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="alert alert-info mt-3">
              <small>
                <strong>Nota:</strong> Al eliminar una categoría, los productos
                asociados quedarán sin categoría pero no se eliminarán.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
