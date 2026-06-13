import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRouter      from './routes/auth.js'
import productosRouter from './routes/productos.js'
import facturasRouter  from './routes/facturas.js'
import auditoriaRouter from './routes/auditoria.js'
import empleadosRouter from './routes/empleados.js'
import toppingsRouter  from './routes/toppings.js'
import categoriasRouter from './routes/categorias.js'
import inventarioRouter from './routes/inventario.js'
import cajaRouter       from './routes/caja.js'

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'https://nixgelato.vercel.app',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origen no permitido: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.options('*', cors())
app.use(express.json())

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

// ── Healthcheck ────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── Error handler global ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message || err)
  res.status(500).json({ message: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API escuchando en puerto ${PORT}`)
})
