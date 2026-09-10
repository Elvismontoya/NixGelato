-- ============================================================
-- MIGRACIÓN v9: Configuración del negocio en BD
-- Antes vivía hardcodeada en Ticket.jsx (NIT, dirección, IVA...).
-- Tabla de una sola fila (id = 1).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.configuracion_negocio (
  id              smallint     PRIMARY KEY DEFAULT 1,
  nombre          text         NOT NULL DEFAULT 'NixGelato',
  nit             text         NOT NULL DEFAULT '',
  direccion       text         NOT NULL DEFAULT '',
  telefono        text         NOT NULL DEFAULT '',
  regimen         text         NOT NULL DEFAULT 'Responsable de IVA',
  iva_porcentaje  numeric      NOT NULL DEFAULT 19 CHECK (iva_porcentaje >= 0 AND iva_porcentaje <= 100),
  pie_ticket      text         NOT NULL DEFAULT '¡Gracias por tu compra!',
  actualizado_en  timestamp    NOT NULL DEFAULT now(),
  CONSTRAINT configuracion_negocio_fila_unica CHECK (id = 1)
);

INSERT INTO public.configuracion_negocio (id, nombre, nit, direccion, telefono, regimen)
VALUES (1, 'NixGelato', '123.456.789-0', 'Cll 1 #1-2', '310 000 0000', 'Responsable de IVA')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY;
