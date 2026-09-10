// Composition root: único lugar donde se eligen las implementaciones
// concretas (repositorios Supabase + adapters) y se inyectan en los servicios.
// Las rutas importan los servicios ya cableados desde aquí.
import * as empleadosRepo from './repositories/empleadosRepo.js'
import * as rolesRepo from './repositories/rolesRepo.js'
import * as authRepo from './repositories/authRepo.js'
import * as auditoriaRepo from './repositories/auditoriaRepo.js'
import * as categoriasRepo from './repositories/categoriasRepo.js'
import * as productosRepo from './repositories/productosRepo.js'
import * as inventarioRepo from './repositories/inventarioRepo.js'
import * as facturasRepo from './repositories/facturasRepo.js'
import * as metodosPagoRepo from './repositories/metodosPagoRepo.js'
import * as cajaRepo from './repositories/cajaRepo.js'
import * as toppingsRepo from './repositories/toppingsRepo.js'
import * as configRepo from './repositories/configRepo.js'

import { clock } from './adapters/clock.js'
import { hasher } from './adapters/hasher.js'
import { tokenSigner } from './adapters/tokenSigner.js'

import { crearAuthService } from './services/authService.js'
import { crearEmpleadosService } from './services/empleadosService.js'
import { crearCategoriasService } from './services/categoriasService.js'
import { crearProductosService } from './services/productosService.js'
import { crearInventarioService } from './services/inventarioService.js'
import { crearFacturasService } from './services/facturasService.js'
import { crearCajaService } from './services/cajaService.js'
import { crearAuditoriaService } from './services/auditoriaService.js'
import { crearToppingsService } from './services/toppingsService.js'
import { crearConfigService } from './services/configService.js'

export const authService = crearAuthService({
  empleadosRepo, rolesRepo, authRepo, hasher, tokenSigner,
})

export const empleadosService = crearEmpleadosService({
  empleadosRepo, rolesRepo, auditoriaRepo, hasher,
})

export const categoriasService = crearCategoriasService({
  categoriasRepo, auditoriaRepo,
})

export const productosService = crearProductosService({
  productosRepo, categoriasRepo, inventarioRepo, auditoriaRepo,
})

export const inventarioService = crearInventarioService({
  inventarioRepo, productosRepo, auditoriaRepo,
})

export const facturasService = crearFacturasService({
  facturasRepo, metodosPagoRepo, auditoriaRepo,
})

export const cajaService = crearCajaService({
  cajaRepo, auditoriaRepo, clock,
})

export const auditoriaService = crearAuditoriaService({
  auditoriaRepo, facturasRepo, clock,
})

export const toppingsService = crearToppingsService({ toppingsRepo })

export const configService = crearConfigService({ configRepo, auditoriaRepo })
