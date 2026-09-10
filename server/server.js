import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import { errorHandler } from './middleware/errorHandler.js'
import authRouter      from './routes/auth.js'
import productosRouter from './routes/productos.js'
import facturasRouter  from './routes/facturas.js'
import auditoriaRouter from './routes/auditoria.js'
import empleadosRouter from './routes/empleados.js'
import toppingsRouter  from './routes/toppings.js'
import categoriasRouter from './routes/categorias.js'
import inventarioRouter from './routes/inventario.js'
import cajaRouter       from './routes/caja.js'
import configRouter     from './routes/config.js'

const app = express()

// Detrás del proxy de Railway/Vercel: necesario para que rate-limit y los
// logs vean la IP real del cliente (X-Forwarded-For).
app.set('trust proxy', 1)
app.disable('x-powered-by')

// Cabeceras de seguridad. La API sólo devuelve JSON (no HTML), por lo que
// no se necesita CSP; el resto de defaults de helmet sí aplican (HSTS,
// nosniff, frameguard, referrer-policy, etc.).
app.use(helmet({ contentSecurityPolicy: false }))

const allowedOrigins = [
  'http://localhost:5173',
  'https://nixgelato.vercel.app',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean)

// Previews de Vercel: https://nixgelato-<hash>-<scope>.vercel.app, etc.
const vercelPreview = /^https:\/\/nixgelato[a-z0-9-]*\.vercel\.app$/

function originPermitido(origin) {
  return allowedOrigins.includes(origin) || vercelPreview.test(origin)
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || originPermitido(origin)) return cb(null, true)
    cb(new Error(`CORS: origen no permitido: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.options('*', cors())
app.use(express.json({ limit: '100kb' }))

// ── Rutas ──────────────────────────────────────────────────
app.use('/api/auth',       authRouter)
app.use('/api/productos',  productosRouter)
app.use('/api/facturas',   facturasRouter)
app.use('/api/auditoria',  auditoriaRouter)
app.use('/api/empleados',  empleadosRouter)
app.use('/api/toppings',   toppingsRouter)
app.use('/api/categorias', categoriasRouter)
app.use('/api/inventario', inventarioRouter)
app.use('/api/caja',       cajaRouter)
app.use('/api/config',     configRouter)

// ── Healthcheck ────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── Error handler global ───────────────────────────────────
app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API escuchando en puerto ${PORT}`)
})
