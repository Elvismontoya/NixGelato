# Base de datos (Supabase)

Proyecto: `xgefpxqgfcdyuigzumpo`

## Migraciones

`supabase/migrations/*.sql` — historial versionado, en orden por timestamp:

| Archivo | Contenido |
|---|---|
| `00000000000000_base_schema.sql` | Esquema base v1 — **pendiente de capturar** (`supabase db pull`) |
| `…_v2_anular_ventas_multicaja.sql` | Columnas de anulación en `facturas`, `revertir_stock`, `existe_apertura_hoy`, índice multi-caja |
| `…_v3_registrar_venta_integridad_precios.sql` | Columna `productos_facturas.toppings` + RPC transaccional `registrar_venta` |
| `…_v4_caja_compartida_una_por_dia.sql` | Índice único parcial "una caja abierta por día" |
| `…_v5_crear_admin_inicial_atomico.sql` | RPC `crear_admin_inicial` con advisory lock |
| `…_v6_hardening_funciones_rpc.sql` | `REVOKE EXECUTE` a `PUBLIC/anon/authenticated` + `search_path` fijo |
| `…_v7_anular_venta_transaccional.sql` | RPC transaccional `anular_venta` |
| `…_v8_drop_funciones_legadas.sql` | Elimina `actualizar_stock`, `revertir_stock`, `crear_factura`, `existe_apertura_hoy` |
| `…_v9_configuracion_negocio.sql` | Tabla `configuracion_negocio` (fila única) — datos del negocio, antes hardcodeados en `Ticket.jsx` |
| `…_v10_iva_por_producto.sql` | `productos.tarifa_iva` + desglose IVA por línea (`productos_facturas.tarifa_iva`/`iva_linea`) y por factura (`facturas.total_iva`/`total_base`); `registrar_venta` v2 |

## Estado del remoto

Todas (v2–v10) **están aplicadas** en producción (v2 a mano en el editor SQL; v3–v10 vía el conector de Supabase). Funciones vivas en la BD: `registrar_venta`, `anular_venta`, `crear_admin_inicial`.

## Flujo con la CLI

```bash
supabase link --project-ref xgefpxqgfcdyuigzumpo
supabase db pull                 # captura el esquema base en 00000000000000_*.sql
supabase migration list          # ver estado local vs remoto
supabase db push                 # aplica lo que falte (p.ej. v8)
```

> Si `db push` reporta desincronización porque v2–v7 se aplicaron fuera de la CLI,
> usar `supabase migration repair --status applied <version>` para marcarlas como
> ya aplicadas sin re-ejecutarlas.

## Aplicar la v8 sin CLI

Pegar el contenido de `…_v8_drop_funciones_legadas.sql` en el editor SQL de Supabase.
