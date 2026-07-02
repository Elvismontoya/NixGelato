# 🍦 NixGelato

Sistema de Punto de Venta (POS) web para heladerías, diseñado para gestionar ventas, empleados, inventario y caja registradora de forma simple y eficiente.

## 📋 Descripción

NixGelato es una aplicación web que permite a heladerías y negocios similares gestionar su operación diaria: desde la apertura de caja y el registro de ventas, hasta el control de empleados, inventario y la impresión de recibos fiscales.

Pensado inicialmente para el mercado colombiano, con soporte para cumplimiento tributario local (NIT, IVA, título de documento equivalente en recibos térmicos de 80mm).

## ✨ Funcionalidades principales

- **Punto de venta (POS)**: interfaz rápida para registrar ventas, con atajos de teclado.
- **Gestión de empleados**: CRUD de empleados con control de acceso basado en roles.
- **Caja registradora diaria**: apertura y cierre de caja compartida, con cálculo automático de diferencias. Apertura obligatoria mediante modal.
- **Dashboard administrativo**: métricas en tiempo real y gráfico de ingresos de los últimos 7 días.
- **Historial de ventas**: consulta de ventas por producto, con vistas paginadas y exportación a CSV.
- **Anulación de facturas**: con reversión automática de stock.
- **Inventario**: ajuste en línea de existencias, con vista previa de imágenes por URL.
- **Recibos térmicos**: impresión en impresoras térmicas de 80mm, con cumplimiento tributario colombiano.
- **Configuración del negocio**: panel de configuración almacenado en base de datos.
- **Sincronización entre pestañas**: la sesión se mantiene sincronizada entre distintas pestañas del navegador.

## 🏗️ Arquitectura y stack tecnológico

| Componente | Tecnología |
|---|---|
| Frontend | React 18 + Vite, React Router. Desplegado en [Vercel](https://vercel.com) |
| Backend | Node.js (carpeta `server/`). Desplegado en [Railway](https://railway.app) |
| Base de datos | [Supabase](https://supabase.com) (PostgreSQL) |
| Autenticación | `bcrypt` para hash de contraseñas |
| Control de versiones / CI | GitHub |

> ℹ️ El backend vive en una subcarpeta `server/` con su propio `package.json`. Si usa Express u otro framework, agrégalo aquí.

## 🚀 Empezando

### Requisitos previos

- Node.js (versión recomendada: LTS)
- Cuenta de [Supabase](https://supabase.com) con un proyecto configurado
- Cuentas de [Railway](https://railway.app) y [Vercel](https://vercel.com) para despliegue

### Instalación local (Windows / PowerShell)

```powershell
# Clonar el repositorio
git clone https://github.com/<tu-usuario>/nixgelato.git
cd nixgelato

# Instalar dependencias del frontend
npm install

# Instalar dependencias del backend
npm --prefix server install

# Copiar variables de entorno de ejemplo
copy .env.example .env
```

### Variables de entorno

Configura las siguientes variables (ajusta nombres según tu proyecto):

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

### Ejecutar en desarrollo

El proyecto está dividido en frontend (raíz, Vite) y backend (carpeta `server/`).

```powershell
# Frontend solamente
npm run dev

# Backend solamente
npm run dev:server

# Frontend + backend a la vez (usando concurrently)
npm run dev:all
```

### Otros scripts disponibles

| Script | Descripción |
|---|---|
| `npm run build` | Compila el frontend para producción (Vite) |
| `npm run preview` | Sirve localmente el build de producción del frontend |
| `npm run start:server` | Inicia el backend en modo producción |

## 📦 Despliegue

- **Backend**: se despliega automáticamente en Railway a partir de la rama principal en GitHub.
- **Frontend**: se despliega automáticamente en Vercel a partir de la rama principal en GitHub.
- **Base de datos**: gestionada en Supabase (PostgreSQL en la nube).

## 🗺️ Roadmap

- [ ] Arquitectura multi-tenant / white-label para comercializar el sistema a otros negocios similares
- [ ] Ampliar el panel de configuración del negocio

## 👥 Autores

- Elvis
- Juan Hernandez

## 📄 Licencia

_Pendiente de definir._
