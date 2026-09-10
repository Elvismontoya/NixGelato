-- ============================================================
-- NixGelato — DATOS SEMILLA para una instancia nueva
-- ============================================================
-- Ejecutar DESPUÉS de supabase/schema.sql, en el SQL Editor del proyecto nuevo.
-- Solo datos imprescindibles para operar. Categorías, productos y toppings
-- se cargan desde el panel de administración de la app.
-- Idempotente: ON CONFLICT DO NOTHING.
-- ============================================================

begin;

-- Roles: 'admin' es obligatorio (crear_admin_inicial lo busca por nombre).
insert into public.roles (nombre_rol, descripcion, activo) values
  ('admin',  'Administrador del sistema', true),
  ('cajero', 'Usuario de caja',           true)
on conflict (nombre_rol) do nothing;

-- Métodos de pago: sin al menos uno activo, registrar_venta falla
-- (busca el método por nombre).
insert into public.metodos_pago (nombre_metodo, descripcion, activo) values
  ('Efectivo',      'Pago con dinero en efectivo',                 true),
  ('Transferencia', 'Nequi / Daviplata / transferencia bancaria',  true)
on conflict (nombre_metodo) do nothing;

-- Configuración del negocio: fila única id = 1. Ajusta estos valores
-- (o hazlo luego desde el panel: pestaña "🏪 Negocio").
insert into public.configuracion_negocio
  (id, nombre, nit, direccion, telefono, regimen, iva_porcentaje, pie_ticket)
values
  (1, 'Nombre del negocio', '', '', '', 'Responsable de IVA', 19, '¡Gracias por tu compra!')
on conflict (id) do nothing;

commit;

-- Siguiente paso: crear el primer administrador desde la app
-- (pantalla de login → pestaña "Configuración inicial"), que llama al
-- RPC crear_admin_inicial. NO insertes el admin a mano aquí: el hash de
-- la contraseña lo genera el backend con bcrypt.
