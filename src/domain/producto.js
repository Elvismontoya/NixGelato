// Adaptadores de forma para producto/topping. El backend devuelve nombres
// distintos según el endpoint (nombre vs nombre_producto, etc.); estas
// funciones normalizan la lectura en la vista.
export const idProducto = (p) => p.id ?? p.id_producto;
export const nombreProducto = (p) => p.nombre ?? p.nombre_producto;
export const precioProducto = (p) =>
  Number(p.precio ?? p.precio_venta_unitario ?? 0);
export const stockProducto = (p) => p.stock ?? p.stock_actual ?? 0;
export const permiteToppings = (p) =>
  p.permiteToppings ?? p.permite_toppings ?? false;

export const nombreTopping = (t) => t.nombre ?? t.nombre_topping;
export const precioTopping = (t) => Number(t.precio_adicional ?? t.precio ?? 0);
