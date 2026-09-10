# Levantar NixGelato para otro negocio

Cada negocio es un **stack independiente**: su propio proyecto Supabase + su
propio backend (Railway) + su propio frontend (Vercel). La app **no** es
multi‑tenant; no se comparte base de datos entre negocios.

---

## 1. Base de datos (Supabase)

1. En [supabase.com](https://supabase.com) → **New project**. Anota:
   - **Project URL** → `https://<ref>.supabase.co`
   - **service_role key** → `Settings → API → Project API keys → service_role`
2. Abre **SQL Editor** y ejecuta, en este orden:
   1. `supabase/schema.sql` — crea todas las tablas, índices y las 3 funciones RPC
      (equivale a base v1 + migraciones v2…v10; **no** hay que aplicar las
      migraciones una por una).
   2. `supabase/seed.sql` — roles (`admin`, `cajero`), métodos de pago
      (`Efectivo`, `Transferencia`) y la fila de `configuracion_negocio`.
3. (Opcional) Edita la fila de `configuracion_negocio` con los datos reales, o
   hazlo después desde la app (panel admin → pestaña **🏪 Negocio**).

> Sin `metodos_pago` activos no se puede cobrar (el RPC `registrar_venta` busca
> el método por nombre). Sin el rol `admin` no se puede crear el primer usuario.

## 2. Backend (Railway)

Nuevo servicio desde el mismo repo, **root directory `server/`**. Variables de
entorno (ver `server/.env.example`):

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://<ref-nuevo>.supabase.co` |
| `SUPABASE_SERVICE_ROLE` | service_role key del proyecto nuevo |
| `JWT_SECRET` | **clave nueva y distinta** por negocio (≥ 32 chars aleatorios) |
| `FRONTEND_ORIGIN` | URL pública del frontend de este negocio (CORS) |
| `BCRYPT_SALT_ROUNDS` | `10` |
| `PORT` | `4000` |

`JWT_SECRET` distinto por negocio: así un token emitido para un negocio nunca
sirve en otro.

## 3. Frontend (Vercel)

Nuevo proyecto desde el mismo repo. Variable de entorno:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | URL pública del backend de este negocio (Railway) |

Asigna su dominio o subdominio.

## 4. Primer administrador

1. Abre el frontend nuevo → pantalla de **login**.
2. Si no hay ningún admin, aparece la pestaña **"Configuración inicial"**.
   Rellena nombres, apellidos, usuario y contraseña.
3. Eso llama a `POST /api/auth/register-admin` → RPC `crear_admin_inicial`
   (solo funciona mientras no exista ningún admin activo).
4. Entra con ese usuario y carga categorías, productos y toppings desde el
   panel de administración.

## 5. Checklist rápido

- [ ] Proyecto Supabase creado; `schema.sql` y `seed.sql` ejecutados sin error
- [ ] `configuracion_negocio` con los datos del negocio
- [ ] Backend desplegado con sus 6 variables de entorno
- [ ] `GET /api/health` (o la raíz del backend) responde OK
- [ ] Frontend desplegado con `VITE_API_URL` apuntando a ese backend
- [ ] `FRONTEND_ORIGIN` del backend = dominio real del frontend
- [ ] Primer admin creado desde "Configuración inicial"
- [ ] Prueba de humo: crear un producto con stock, hacer una venta, anularla

---

## Mantener `schema.sql` al día

`schema.sql` es una foto del estado actual. Cuando añadas una migración nueva
al proyecto original (`supabase/migrations/`), replica el mismo cambio aquí
(añadir la columna / función). Alternativa con CLI:

```bash
npx supabase link --project-ref xgefpxqgfcdyuigzumpo
npx supabase db dump --file supabase/schema.sql
```
