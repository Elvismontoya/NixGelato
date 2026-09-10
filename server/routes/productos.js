// Capa HTTP de productos.
import express from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { productoSchema } from "../schemas/index.js";
import { productosService } from "../container.js";

const router = express.Router();

// ── GET /api/productos ────────────────────────────────────
router.get(
  "/",
  verifyToken,
  asyncHandler(async (_req, res) => {
    res.json(await productosService.listarAgrupado());
  }),
);

// ── POST /api/productos ───────────────────────────────────
router.post(
  "/",
  verifyToken,
  requireAdmin,
  validate(productoSchema),
  asyncHandler(async (req, res) => {
    const { id } = await productosService.crear(
      req.body ?? {},
      req.user.id_empleado,
    );
    res.status(201).json({ message: "Producto creado", id });
  }),
);

// ── PUT /api/productos/:id ────────────────────────────────
router.put(
  "/:id",
  verifyToken,
  requireAdmin,
  validate(productoSchema),
  asyncHandler(async (req, res) => {
    await productosService.actualizar(
      req.params.id,
      req.body ?? {},
      req.user.id_empleado,
    );
    res.json({ message: "Producto actualizado" });
  }),
);

// ── DELETE /api/productos/:id ─────────────────────────────
router.delete(
  "/:id",
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { producto } = await productosService.eliminar(
      req.params.id,
      req.user.id_empleado,
    );
    res.json({ message: "Producto eliminado correctamente", producto });
  }),
);

// ── GET /api/productos/:id/ventas ─────────────────────────
router.get(
  "/:id/ventas",
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await productosService.ventas(req.params.id, req.query));
  }),
);

export default router;
