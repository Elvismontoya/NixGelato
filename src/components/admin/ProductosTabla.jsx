import { money } from "../../domain/money.js";

const IMG_FALLBACK =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNGOEY5RkEiLz48cGF0aCBkPSJNMjQgMzJMMjAgMjhIMTZMMTIgMzJMMTYgMzZIMjBMMjQgMzJaIiBmaWxsPSIjRDZENkQ2Ii8+PC9zdmc+";

function badgeStock(stock) {
  const n = Number(stock);
  return n > 10 ? "bg-success" : n > 0 ? "bg-warning text-dark" : "bg-danger";
}

// Toolbar de filtros + tabla de productos. Presentacional.
export default function ProductosTabla({
  q,
  setQ,
  filterCat,
  setFilterCat,
  sortBy,
  setSortBy,
  onlyToppings,
  setOnlyToppings,
  categorias,
  loading,
  productos,
  msgTabla,
  onLimpiarFiltros,
  onHistorial,
  onEditar,
  onEliminar,
}) {
  return (
    <div className="col-lg-8">
      <div className="card card-soft h-100">
        <div className="card-body">
          {/* Toolbar de filtros */}
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-md-4">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Nombre, categoría o ID…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Ordenar por</label>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="nombre-asc">Nombre (A–Z)</option>
                <option value="nombre-desc">Nombre (Z–A)</option>
                <option value="precio-asc">Precio (menor)</option>
                <option value="precio-desc">Precio (mayor)</option>
                <option value="stock-asc">Stock (menor)</option>
                <option value="stock-desc">Stock (mayor)</option>
              </select>
            </div>
            <div className="col-12 col-md-2 d-flex gap-2">
              <div className="form-check mt-auto">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="onlyToppings"
                  checked={onlyToppings}
                  onChange={(e) => setOnlyToppings(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="onlyToppings">
                  Solo toppings
                </label>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="table-responsive" style={{ maxHeight: 520 }}>
            <table className="table align-middle">
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "var(--white)",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th>Producto</th>
                  <th className="text-center">Categoría</th>
                  <th className="text-center">Precio</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Toppings</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody className="stagger-children">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td colSpan={6}>
                        <div className="placeholder-wave">
                          <span className="placeholder col-12" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <div className="text-muted mb-2">
                        No se encontraron productos
                      </div>
                      <button
                        className="btn btn-outline-brand"
                        onClick={onLimpiarFiltros}
                      >
                        Limpiar filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  productos.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {p.img ? (
                            <img
                              src={p.img}
                              alt={p.nombre}
                              style={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #ddd",
                              }}
                              onError={(e) => {
                                e.currentTarget.src = IMG_FALLBACK;
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 8,
                                border: "1px dashed #ddd",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                color: "#888",
                                backgroundColor: "#f8f9fa",
                              }}
                            >
                              sin img
                            </div>
                          )}
                          <div>
                            <div className="fw-semibold">{p.nombre}</div>
                            <div className="small text-muted">ID: {p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">
                          {p.categoria || "Sin categoría"}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="price-badge">{money(p.precio)}</span>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${badgeStock(p.stock)}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="text-center">
                        {p.permiteToppings ? (
                          <span className="badge text-bg-success">Sí</span>
                        ) : (
                          <span className="badge text-bg-secondary">No</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2 flex-nowrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary btn-table-action"
                            onClick={() => onHistorial(p)}
                            title="Historial de ventas"
                          >
                            📊
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-brand btn-table-action"
                            onClick={() => onEditar(p)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger btn-table-action"
                            onClick={() => onEliminar(p)}
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

          <p className="small text-muted mt-2 mb-0">{msgTabla}</p>
        </div>
      </div>
    </div>
  );
}
