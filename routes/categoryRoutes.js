import { Router } from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
} from "../controllers/categoryController.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

// Students and admins
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admins only
router.post("/", requireAdmin, createCategory);
router.put("/:id", requireAdmin, updateCategory);
router.delete("/:id", requireAdmin, deactivateCategory);

export default router;