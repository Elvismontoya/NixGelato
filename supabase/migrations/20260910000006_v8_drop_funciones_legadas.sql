-- ============================================================
-- MIGRACIÓN v8: Eliminar funciones legadas ya sin uso
-- El backend refactorizado usa registrar_venta / anular_venta;
-- estas funciones no las llama nadie.
-- ============================================================

DROP FUNCTION IF EXISTS public.actualizar_stock(integer, integer);
DROP FUNCTION IF EXISTS public.revertir_stock(integer, integer);
DROP FUNCTION IF EXISTS public.crear_factura(integer, text, text, numeric, jsonb);
DROP FUNCTION IF EXISTS public.existe_apertura_hoy();
DROP FUNCTION IF EXISTS public.existe_apertura_hoy(integer);
