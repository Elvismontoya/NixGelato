// Capa HTTP de categorías.
import express from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { categoriaSchema } from "../schemas/index.js";
import { categoriasService } from "../container.js";

const router = express.Router();

// GET /api/categorias
router.get(
  "/",
  verifyToken,
  asyncHandler(async (_req, res) => {
    res.set("Cache-Control", "private, max-age=30");
    res.json(await categoriasService.listar());
  }),
);

// POST /api/categorias
router.post(
  "/",
  verifyToken,
  requireAdmin,
  validate(categoriaSchema),
  asyncHandler(async (req, res) => {
    const categoria = await categoriasService.crear(req.body ?? {});
    res
      .status(201)
      .json({ message: "Categoría creada correctamente", categoria });
  }),
);

// PUT /api/categorias/:id
router.put(
  "/:id",
  verifyToken,
  requireAdmin,
  validate(categoriaSchema),
  asyncHandler(async (req, res) => {
    const categoria = await categoriasService.actualizar(
      req.params.id,
      req.body ?? {},
    );
    res.json({ message: "Categoría actualizada correctamente", categoria });
  }),
);

// DELETE /api/categorias/:id  (soft delete)
router.delete(
  "/:id",
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { message, categoria } = await categoriasService.eliminar(
      req.params.id,
      req.user.id_empleado,
    );
    res.json({ message, categoria });
  }),
);

export default router;
