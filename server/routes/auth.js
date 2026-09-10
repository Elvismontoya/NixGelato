// Capa HTTP de autenticación: parsea la petición, delega en authService y
// responde. Sin reglas de negocio ni acceso a datos.
import express from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../lib/asyncHandler.js";
import { verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerAdminSchema } from "../schemas/index.js";
import { authService } from "../container.js";

const router = express.Router();

// Anti fuerza bruta: límite por IP en endpoints sensibles de auth.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // 20 intentos por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  },
});

// ── GET /api/auth/check-initial ────────────────────────────
router.get(
  "/check-initial",
  asyncHandler(async (_req, res) => {
    res.json({ needsAdmin: await authService.needsInitialAdmin() });
  }),
);

// ── POST /api/auth/register-admin ─────────────────────────
router.post(
  "/register-admin",
  authLimiter,
  validate(registerAdminSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.registerAdmin(req.body ?? {});
    res.json({ message: "Administrador creado correctamente", ...result });
  }),
);

// ── POST /api/auth/login ───────────────────────────────────
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body ?? {});
    res.json({ message: "Login exitoso", ...result });
  }),
);

// ── GET /api/auth/me ───────────────────────────────────────
router.get(
  "/me",
  verifyToken,
  asyncHandler(async (req, res) => {
    res.json(await authService.getProfile(req.user.id_empleado, req.user.rol));
  }),
);

export default router;
