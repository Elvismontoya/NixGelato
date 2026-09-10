// Schemas zod para la forma de las peticiones. NO duplican reglas de negocio:
// los campos obligatorios que el servicio ya valida se dejan opcionales aquí,
// para que el mensaje de negocio (en español) siga viniendo del servicio.
// El objetivo es rechazar payloads con TIPOS/ESTRUCTURA inválidos antes de
// que lleguen a la capa de negocio.
import { z } from "zod";

const str = z.string().optional();
const passthrough = (shape) => z.object(shape).passthrough();

// ── auth ──────────────────────────────────────────────────
export const loginSchema = passthrough({
  usuario: str,
  password: str,
});

export const registerAdminSchema = passthrough({
  nombres: str,
  apellidos: str,
  usuario: str,
  password: str,
});

// ── empleados ─────────────────────────────────────────────
export const crearEmpleadoSchema = passthrough({
  nombres: str,
  apellidos: str,
  usuario: str,
  password: str,
  documento: str,
  telefono: str,
  rol: str,
});

export const actualizarEmpleadoSchema = passthrough({
  nombres: str,
  apellidos: str,
  usuario: str,
  documento: str,
  telefono: str,
  rol: str,
});

export const cambiarPasswordSchema = passthrough({ password: str });

// ── productos ─────────────────────────────────────────────
export const productoSchema = passthrough({
  nombre: str,
  precio: z.union([z.number(), z.string()]).optional(),
  stock: z.union([z.number(), z.string()]).optional(),
  img: z.string().nullish(),
  permiteToppings: z.any().optional(),
  id_categoria: z.union([z.number(), z.string()]).nullish(),
  tarifa_iva: z.union([z.number(), z.string()]).optional(),
});

// ── categorías ────────────────────────────────────────────
export const categoriaSchema = passthrough({ nombre: str, descripcion: str });

// ── inventario ────────────────────────────────────────────
export const ajustarStockSchema = passthrough({
  stock_actual: z.union([z.number(), z.string()]).optional(),
  stock_minimo: z.union([z.number(), z.string()]).nullish(),
});

// ── facturas ──────────────────────────────────────────────
export const registrarVentaSchema = passthrough({
  cliente: z.string().nullish(),
  metodo_pago: str,
  // Debe ser un array si viene (evita 500 en el servicio); su contenido lo
  // normaliza domain/venta.js.
  productos: z.array(z.any()).optional(),
});

export const anularVentaSchema = passthrough({ motivo: str });

// ── caja ──────────────────────────────────────────────────
export const aperturaCajaSchema = passthrough({
  monto_apertura: z.union([z.number(), z.string()]).optional(),
  observaciones: z.string().nullish(),
});

export const cierreCajaSchema = passthrough({
  id_apertura: z.union([z.number(), z.string()]).optional(),
  monto_cierre: z.union([z.number(), z.string()]).optional(),
  observaciones: z.string().nullish(),
});

// ── auditoría ─────────────────────────────────────────────
export const registrarAuditoriaSchema = passthrough({
  accion: str,
  tabla_afectada: str,
  id_registro_afectado: z.union([z.number(), z.string()]).nullish(),
  descripcion: z.string().nullish(),
});

// ── configuración del negocio ─────────────────────────────
export const configNegocioSchema = passthrough({
  nombre: str,
  nit: str,
  direccion: str,
  telefono: str,
  regimen: str,
  pie_ticket: str,
  iva_porcentaje: z.union([z.number(), z.string()]).optional(),
});
