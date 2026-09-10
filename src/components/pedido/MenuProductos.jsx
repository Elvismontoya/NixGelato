import { money } from "../../domain/money.js";
import {
  idProducto,
  nombreProducto,
  precioProducto,
  stockProducto,
  permiteToppings,
} from "../../domain/producto.js";

// Panel izquierdo del POS: buscador + resultados + grilla por categorías.
// Presentacional: `busqueda`, `productosFiltrados` y `categorias` vienen del
// contenedor, que también decide la selección.
export default function MenuProductos({
  busqueda,
  setBusqueda,
  productosFiltrados,
  categorias,
  onSeleccionar,
}) {
  return (
    <>
      {/* Título + buscador */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="fw-bold mb-0">🍦 Menú</h4>
        <div style={{ maxWidth: 320, width: "100%" }}>
          <div className="input-group">
            <span className="input-group-text">🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoComplete="off"
            />
            {busqueda && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => setBusqueda("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resultados del buscador */}
      {busqueda && (
        <div className="mb-4">
          {productosFiltrados.length === 0 ? (
            <p className="text-muted text-center py-3">
              Sin resultados para "{busqueda}"
            </p>
          ) : (
            <div className="row g-2">
              {productosFiltrados.map((p) => {
                const stock = stockProducto(p);
                return (
                  <div className="col-md-4 col-sm-6" key={idProducto(p)}>
                    <div
                      className={`card h-100 border-0 shadow-sm ${stock <= 0 ? "opacity-50" : "hover-lift cursor-pointer"}`}
                      onClick={() => stock > 0 && onSeleccionar(p)}
                    >
                      <div className="card-body p-3 d-flex align-items-center gap-3">
                        <img
                          src={p.img || ""}
                          alt={nombreProducto(p)}
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <div className="flex-grow-1 min-w-0">
                          <div className="fw-semibold small text-truncate">
                            {nombreProducto(p)}
                          </div>
                          <div className="small text-muted">{p._catNombre}</div>
                          <div className="fw-bold text-success small">
                            {money(precioProducto(p))}
                          </div>
                        </div>
                        <span
                          className={`badge ${stock > 0 ? "bg-success" : "bg-danger"}`}
                        >
                          {stock <= 0 ? "Agotado" : stock}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Grilla por categorías */}
      {!busqueda && (
        <div>
          {categorias.map((cat, idx) => (
            <section key={cat.id ?? cat.id_categoria} className="mb-5">
              <div className="d-flex align-items-center gap-2 mb-3">
                <h5 className="fw-bold mb-0">{cat.nombre}</h5>
                <span className="badge bg-light text-dark border">
                  {cat.productos?.length ?? 0}
                </span>
              </div>
              <div className="row g-3">
                {(cat.productos ?? []).map((p) => {
                  const stock = stockProducto(p);
                  const sinStock = stock <= 0;
                  return (
                    <div
                      className="col-xxl-3 col-lg-4 col-md-6"
                      key={idProducto(p)}
                    >
                      <div
                        className={`product-card card border-0 h-100 ${sinStock ? "opacity-50" : "hover-lift cursor-pointer"}`}
                        onClick={() => !sinStock && onSeleccionar(p)}
                      >
                        <div className="product-image-container position-relative">
                          <img
                            src={p.img || ""}
                            alt={nombreProducto(p)}
                            className="product-image"
                            onError={(e) => {
                              e.target.parentElement.style.background =
                                "#f8f9fa";
                              e.target.style.display = "none";
                            }}
                          />
                          <div className="product-overlay">
                            <span
                              className={`badge ${sinStock ? "bg-danger" : "bg-success"}`}
                            >
                              {sinStock ? "Agotado" : `Stock: ${stock}`}
                            </span>
                          </div>
                          {permiteToppings(p) && (
                            <div className="product-badge-top">
                              <span className="badge bg-info">+Toppings</span>
                            </div>
                          )}
                        </div>
                        <div className="card-body p-3">
                          <h6
                            className="fw-semibold mb-1"
                            style={{ fontSize: "0.88rem" }}
                          >
                            {nombreProducto(p)}
                          </h6>
                          <div className="fw-bold text-success">
                            {money(precioProducto(p))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {idx < categorias.length - 1 && <hr className="my-4" />}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
