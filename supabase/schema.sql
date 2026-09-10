-- ============================================================
-- NixGelato — ESQUEMA COMPLETO (estado actual = base v1 + migraciones v2..v10)
-- ============================================================
-- Snapshot reconstruido desde el proyecto de producción (xgefpxqgfcdyuigzumpo).
-- Sirve para levantar una instancia NUEVA desde cero (otro negocio):
--   1. Crear un proyecto Supabase vacío.
--   2. Pegar este archivo en el SQL Editor y ejecutarlo.
--   3. Ejecutar supabase/seed.sql (roles, métodos de pago, config).
--   4. Crear el primer admin desde la pantalla "Configuración inicial" de la app.
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS y CREATE OR REPLACE.
-- Las migraciones de supabase/migrations/*.sql quedan solo como historial del
-- proyecto original; una instancia nueva NO necesita aplicarlas: ya están aquí.
-- ============================================================

begin;

-- ─────────────────────────────────────────────────────────────
-- Tablas (en orden de dependencias de claves foráneas)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.roles (
  id_rol       serial primary key,
  nombre_rol   text not null unique,
  descripcion  text,
  activo       boolean default true
);

create table if not exists public.empleados (
  id_empleado    serial primary key,
  nombres        text not null,
  apellidos      text not null,
  documento      text,
  telefono       text,
  usuario_login  text not null unique,
  password_hash  text not null,
  id_rol         integer references public.roles (id_rol),
  activo         boolean default true,
  fecha_creacion timestamp default now()
);

create table if not exists public.categorias (
  id_categoria   serial primary key,
  nombre         text not null unique,
  descripcion    text,
  activo         boolean default true,
  fecha_creacion timestamp default now()
);

create table if not exists public.productos (
  id_producto           serial primary key,
  nombre_producto       text not null,
  id_categoria          integer references public.categorias (id_categoria),
  precio_venta_unitario numeric(12,2) not null check (precio_venta_unitario >= 0),
  costo_unitario        numeric(12,2),
  img                   text,
  permite_toppings      boolean default false,
  activo                boolean default true,
  fecha_creacion        timestamp default now(),
  fecha_actualizacion   timestamp,
  -- v10: IVA configurable por producto (0 = exento)
  tarifa_iva            numeric not null default 19 check (tarifa_iva >= 0 and tarifa_iva <= 100)
);

create table if not exists public.inventario (
  id_producto          integer primary key references public.productos (id_producto) on delete cascade,
  stock_actual         integer not null default 0 check (stock_actual >= 0),
  stock_minimo         integer not null default 0 check (stock_minimo >= 0),
  ultima_actualizacion timestamp default now()
);

create table if not exists public.toppings (
  id_topping     serial primary key,
  nombre_topping text not null unique,
  precio         numeric(12,2) not null check (precio >= 0),
  activo         boolean default true
);

create table if not exists public.metodos_pago (
  id_metodo     serial primary key,
  nombre_metodo text not null unique,
  descripcion   text,
  activo        boolean default true
);

create table if not exists public.facturas (
  id_factura        serial primary key,
  fecha_hora        timestamp default now(),
  id_empleado       integer references public.empleados (id_empleado),
  total_bruto       numeric(12,2) not null check (total_bruto >= 0),
  descuento_total   numeric(12,2) not null default 0 check (descuento_total >= 0),
  total_neto        numeric(12,2) not null check (total_neto >= 0),
  cliente           text,
  observaciones     text,
  -- v2: anulación de ventas
  anulada           boolean not null default false,
  fecha_anulacion   timestamp,
  motivo_anulacion  text,
  id_empleado_anula integer references public.empleados (id_empleado),
  -- v10: desglose de IVA guardado (no recalculado)
  total_iva         numeric not null default 0,
  total_base        numeric not null default 0
);

create table if not exists public.productos_facturas (
  id_detalle            serial primary key,
  id_factura            integer not null references public.facturas (id_factura) on delete cascade,
  id_producto           integer references public.productos (id_producto),
  cantidad              integer not null check (cantidad > 0),
  precio_unitario_venta numeric(12,2) not null check (precio_unitario_venta >= 0),
  subtotal_linea        numeric(12,2) not null check (subtotal_linea >= 0),
  -- v3: snapshot de toppings aplicados
  toppings              jsonb,
  -- v10: IVA por línea
  tarifa_iva            numeric not null default 19,
  iva_linea             numeric not null default 0
);

create table if not exists public.facturas_pagos (
  id_pago      serial primary key,
  id_factura   integer not null references public.facturas (id_factura) on delete cascade,
  id_metodo    integer not null references public.metodos_pago (id_metodo),
  monto_pagado numeric(12,2) not null check (monto_pagado >= 0)
);

create table if not exists public.auditoria (
  id_auditoria         serial primary key,
  id_empleado          integer references public.empleados (id_empleado),
  fecha_hora           timestamp default now(),
  accion               text not null,
  tabla_afectada       text,
  id_registro_afectado text,
  descripcion          text,
  id_producto          integer references public.productos (id_producto)
);

create table if not exists public.aperturas_caja (
  id_apertura            serial primary key,
  id_empleado            integer not null references public.empleados (id_empleado),
  fecha                  date not null default ((now() at time zone 'America/Bogota'::text))::date,
  monto_apertura         numeric(14,2) not null check (monto_apertura >= 0),
  monto_cierre           numeric(14,2),
  total_ventas_efectivo  numeric(14,2),
  diferencia             numeric(14,2),
  estado                 text not null default 'abierta' check (estado = any (array['abierta'::text, 'cerrada'::text])),
  observaciones_apertura text,
  observaciones_cierre   text,
  fecha_hora_apertura    timestamp not null default now(),
  fecha_hora_cierre      timestamp
);

-- v9: configuración del negocio (fila única id = 1)
create table if not exists public.configuracion_negocio (
  id             smallint primary key default 1,
  nombre         text not null default 'NixGelato',
  nit            text not null default '',
  direccion      text not null default '',
  telefono       text not null default '',
  regimen        text not null default 'Responsable de IVA',
  iva_porcentaje numeric not null default 19 check (iva_porcentaje >= 0 and iva_porcentaje <= 100),
  pie_ticket     text not null default '¡Gracias por tu compra!',
  actualizado_en timestamp not null default now(),
  constraint configuracion_negocio_fila_unica check (id = 1)
);

-- ─────────────────────────────────────────────────────────────
-- Índices adicionales
-- ─────────────────────────────────────────────────────────────

-- v4: solo UNA caja abierta por día (caja compartida)
create unique index if not exists idx_apertura_abierta_unica_por_dia
  on public.aperturas_caja (fecha) where (estado = 'abierta'::text);
create index if not exists idx_aperturas_caja_estado on public.aperturas_caja (estado);
create index if not exists idx_aperturas_caja_fecha  on public.aperturas_caja (fecha desc);
create index if not exists idx_facturas_anulada      on public.facturas (anulada);

-- ─────────────────────────────────────────────────────────────
-- Funciones RPC transaccionales (SECURITY DEFINER)
-- Solo las llama el backend con service_role.
-- ─────────────────────────────────────────────────────────────

-- registrar_venta: venta completa atómica. Recalcula precios desde la BD,
-- bloquea inventario (FOR UPDATE), calcula IVA por línea, inserta
-- factura + detalle + pago. Devuelve { id_factura, total, total_iva, total_base }.
create or replace function public.registrar_venta(
  p_id_empleado integer,
  p_cliente     text,
  p_metodo_pago text,
  p_items       jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_item             jsonb;
  v_id_producto      integer;
  v_cantidad         integer;
  v_topping_ids      integer[];
  v_precio_producto  numeric;
  v_nombre_producto  text;
  v_tarifa_iva       numeric;
  v_precio_toppings  numeric;
  v_toppings_json    jsonb;
  v_precio_unitario  numeric;
  v_subtotal_linea   numeric;
  v_iva_linea        numeric;
  v_total            numeric := 0;
  v_total_iva        numeric := 0;
  v_id_factura       integer;
  v_id_metodo        integer;
  v_stock            integer;
  v_cliente          text := NULLIF(btrim(p_cliente), '');
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'SIN_PRODUCTOS' USING ERRCODE = 'P0001';
  END IF;

  SELECT id_metodo INTO v_id_metodo
  FROM metodos_pago
  WHERE lower(nombre_metodo) = lower(p_metodo_pago) AND activo = true;
  IF v_id_metodo IS NULL THEN
    RAISE EXCEPTION 'METODO_PAGO_INVALIDO:%', p_metodo_pago USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO facturas (fecha_hora, id_empleado, total_bruto, descuento_total, total_neto, cliente, observaciones)
  VALUES (now(), p_id_empleado, 0, 0, 0, v_cliente, v_cliente)
  RETURNING id_factura INTO v_id_factura;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_id_producto := NULLIF(v_item->>'id_producto', '')::integer;
    v_cantidad    := NULLIF(v_item->>'cantidad', '')::integer;

    IF v_id_producto IS NULL OR v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'ITEM_INVALIDO' USING ERRCODE = 'P0001';
    END IF;

    SELECT precio_venta_unitario, nombre_producto, tarifa_iva
      INTO v_precio_producto, v_nombre_producto, v_tarifa_iva
    FROM productos
    WHERE id_producto = v_id_producto AND activo = true;
    IF v_precio_producto IS NULL THEN
      RAISE EXCEPTION 'PRODUCTO_NO_DISPONIBLE:%', v_id_producto USING ERRCODE = 'P0001';
    END IF;

    v_topping_ids := COALESCE((
      SELECT array_agg(t::integer)
      FROM jsonb_array_elements_text(COALESCE(v_item->'toppings', '[]'::jsonb)) AS t
    ), '{}');

    v_precio_toppings := 0;
    v_toppings_json   := '[]'::jsonb;
    IF array_length(v_topping_ids, 1) IS NOT NULL THEN
      SELECT COALESCE(sum(precio), 0),
             COALESCE(jsonb_agg(jsonb_build_object(
               'id_topping', id_topping, 'nombre', nombre_topping, 'precio', precio)), '[]'::jsonb)
        INTO v_precio_toppings, v_toppings_json
      FROM toppings
      WHERE id_topping = ANY(v_topping_ids) AND activo = true;
    END IF;

    v_precio_unitario := round(v_precio_producto + v_precio_toppings);
    v_subtotal_linea  := v_precio_unitario * v_cantidad;
    -- el subtotal incluye IVA: iva = subtotal - subtotal/(1+tarifa/100)
    v_iva_linea       := round((v_subtotal_linea - v_subtotal_linea / (1 + v_tarifa_iva / 100))::numeric, 2);
    v_total           := v_total + v_subtotal_linea;
    v_total_iva       := v_total_iva + v_iva_linea;

    SELECT stock_actual INTO v_stock
    FROM inventario
    WHERE id_producto = v_id_producto
    FOR UPDATE;
    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'SIN_INVENTARIO:%', v_id_producto USING ERRCODE = 'P0001';
    END IF;
    IF v_stock < v_cantidad THEN
      RAISE EXCEPTION 'STOCK_INSUFICIENTE:% disp % pedido %', v_nombre_producto, v_stock, v_cantidad USING ERRCODE = 'P0001';
    END IF;

    UPDATE inventario
    SET stock_actual = stock_actual - v_cantidad,
        ultima_actualizacion = now()
    WHERE id_producto = v_id_producto;

    INSERT INTO productos_facturas
      (id_factura, id_producto, cantidad, precio_unitario_venta, subtotal_linea, toppings, tarifa_iva, iva_linea)
    VALUES
      (v_id_factura, v_id_producto, v_cantidad, v_precio_unitario, v_subtotal_linea,
       CASE WHEN v_toppings_json = '[]'::jsonb THEN NULL ELSE v_toppings_json END,
       v_tarifa_iva, v_iva_linea);
  END LOOP;

  UPDATE facturas
  SET total_bruto = v_total,
      total_neto  = v_total,
      total_iva   = v_total_iva,
      total_base  = v_total - v_total_iva
  WHERE id_factura = v_id_factura;

  INSERT INTO facturas_pagos (id_factura, id_metodo, monto_pagado)
  VALUES (v_id_factura, v_id_metodo, v_total);

  RETURN jsonb_build_object(
    'id_factura', v_id_factura,
    'total', v_total,
    'total_iva', v_total_iva,
    'total_base', v_total - v_total_iva
  );
END;
$function$;

-- anular_venta: revierte el stock de todas las líneas y marca la factura como
-- anulada, atómicamente. Lanza FACTURA_NO_EXISTE / YA_ANULADA / MOTIVO_REQUERIDO.
create or replace function public.anular_venta(
  p_id_factura  integer,
  p_motivo      text,
  p_id_empleado integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_factura   facturas%ROWTYPE;
  v_linea     RECORD;
  v_motivo    text := btrim(p_motivo);
BEGIN
  IF v_motivo IS NULL OR v_motivo = '' THEN
    RAISE EXCEPTION 'MOTIVO_REQUERIDO' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_factura
  FROM facturas
  WHERE id_factura = p_id_factura
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FACTURA_NO_EXISTE' USING ERRCODE = 'P0001';
  END IF;
  IF v_factura.anulada THEN
    RAISE EXCEPTION 'YA_ANULADA' USING ERRCODE = 'P0001';
  END IF;

  FOR v_linea IN
    SELECT id_producto, cantidad FROM productos_facturas WHERE id_factura = p_id_factura
  LOOP
    UPDATE inventario
    SET stock_actual = stock_actual + v_linea.cantidad,
        ultima_actualizacion = now()
    WHERE id_producto = v_linea.id_producto;
  END LOOP;

  UPDATE facturas
  SET anulada           = true,
      fecha_anulacion   = now(),
      motivo_anulacion  = v_motivo,
      id_empleado_anula = p_id_empleado
  WHERE id_factura = p_id_factura;

  RETURN jsonb_build_object('total_neto', v_factura.total_neto);
END;
$function$;

-- crear_admin_inicial: crea el primer administrador (solo si no hay ninguno).
-- Serializa con pg_advisory_xact_lock. Lanza ADMIN_YA_EXISTE / USUARIO_EN_USO / etc.
create or replace function public.crear_admin_inicial(
  p_nombres       text,
  p_apellidos     text,
  p_usuario       text,
  p_password_hash text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_id_rol_admin integer;
  v_id_empleado  integer;
  v_usuario      text := btrim(p_usuario);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('crear_admin_inicial'));

  SELECT id_rol INTO v_id_rol_admin
  FROM roles WHERE lower(nombre_rol) = 'admin' LIMIT 1;
  IF v_id_rol_admin IS NULL THEN
    RAISE EXCEPTION 'ROL_ADMIN_NO_EXISTE' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM empleados
    WHERE id_rol = v_id_rol_admin AND activo = true
  ) THEN
    RAISE EXCEPTION 'ADMIN_YA_EXISTE' USING ERRCODE = 'P0001';
  END IF;

  IF v_usuario IS NULL OR v_usuario = '' THEN
    RAISE EXCEPTION 'USUARIO_REQUERIDO' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM empleados WHERE usuario_login = v_usuario) THEN
    RAISE EXCEPTION 'USUARIO_EN_USO' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO empleados (nombres, apellidos, usuario_login, password_hash, id_rol, activo)
  VALUES (btrim(p_nombres), btrim(p_apellidos), v_usuario, p_password_hash, v_id_rol_admin, true)
  RETURNING id_empleado INTO v_id_empleado;

  RETURN jsonb_build_object('id_empleado', v_id_empleado, 'usuario_login', v_usuario);
END;
$function$;

-- v6: las RPC solo se ejecutan desde el backend (service_role).
revoke execute on function public.registrar_venta(integer, text, text, jsonb)  from public, anon, authenticated;
revoke execute on function public.anular_venta(integer, text, integer)          from public, anon, authenticated;
revoke execute on function public.crear_admin_inicial(text, text, text, text)   from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS: habilitado en todas las tablas SIN políticas. El frontend nunca
-- habla con Supabase directamente; solo el backend con service_role
-- (que ignora RLS). anon/authenticated quedan sin acceso.
-- ─────────────────────────────────────────────────────────────
alter table public.roles                 enable row level security;
alter table public.empleados             enable row level security;
alter table public.categorias            enable row level security;
alter table public.productos             enable row level security;
alter table public.inventario            enable row level security;
alter table public.toppings              enable row level security;
alter table public.metodos_pago          enable row level security;
alter table public.facturas              enable row level security;
alter table public.productos_facturas    enable row level security;
alter table public.facturas_pagos        enable row level security;
alter table public.auditoria             enable row level security;
alter table public.aperturas_caja        enable row level security;
alter table public.configuracion_negocio enable row level security;

commit;
