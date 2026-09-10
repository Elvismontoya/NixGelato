-- ============================================================
-- MIGRACIÓN v11: Índices de rendimiento
-- ============================================================
-- El esquema base solo tenía PKs y algún índice suelto. Estas columnas se
-- filtran/ordenan/juntan en casi todas las consultas de listado y, sin
-- índice, hacen sequential scan (coste creciente con el volumen de ventas).
-- Todos IF NOT EXISTS: seguro de re-ejecutar.
-- ============================================================

-- facturas: los listados filtran por rango de fecha y ordenan por fecha desc;
-- el reporte por empleado filtra por id_empleado.
create index if not exists idx_facturas_fecha_hora on public.facturas (fecha_hora desc);
create index if not exists idx_facturas_id_empleado on public.facturas (id_empleado);

-- productos_facturas: el detalle de una venta y la anulación recorren las
-- líneas por id_factura; el historial de ventas de un producto, por id_producto.
create index if not exists idx_prodfact_id_factura  on public.productos_facturas (id_factura);
create index if not exists idx_prodfact_id_producto on public.productos_facturas (id_producto);

-- facturas_pagos: el cálculo de efectivo del día y las RPC juntan por id_factura.
create index if not exists idx_facturas_pagos_id_factura on public.facturas_pagos (id_factura);

-- auditoria: la pantalla de auditoría ordena por fecha desc con limit, y
-- embebe empleado.
create index if not exists idx_auditoria_fecha_hora  on public.auditoria (fecha_hora desc);
create index if not exists idx_auditoria_id_empleado on public.auditoria (id_empleado);

-- productos: el menú del POS y el catálogo hacen WHERE activo = true
-- ORDER BY id_categoria en cada carga.
create index if not exists idx_productos_activo_categoria on public.productos (activo, id_categoria);
