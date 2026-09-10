-- ============================================================
-- MIGRACIÓN v6: Hardening de funciones (advisors de Supabase)
-- - Quitar EXECUTE a PUBLIC/anon/authenticated: las RPC sólo se llaman
--   desde el backend (service_role). REVOKE ALL no basta (GRANT implícito a PUBLIC).
-- - Fijar search_path en funciones legadas.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.registrar_venta(integer, text, text, jsonb)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crear_admin_inicial(text, text, text, text)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.existe_apertura_hoy()                              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.existe_apertura_hoy(integer)                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.actualizar_stock(integer, integer)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revertir_stock(integer, integer)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crear_factura(integer, text, text, numeric, jsonb) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.existe_apertura_hoy()                              SET search_path = public;
ALTER FUNCTION public.existe_apertura_hoy(integer)                       SET search_path = public;
ALTER FUNCTION public.actualizar_stock(integer, integer)                SET search_path = public;
ALTER FUNCTION public.revertir_stock(integer, integer)                  SET search_path = public;
ALTER FUNCTION public.crear_factura(integer, text, text, numeric, jsonb) SET search_path = public;

-- Nota: los avisos "RLS enabled, no policy" en las 12 tablas son el estado
-- DESEADO: el frontend nunca habla con Supabase directamente (sólo el backend
-- con service_role, que ignora RLS). anon/authenticated quedan sin acceso.
