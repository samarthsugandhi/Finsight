import { Router } from "express";
import { healthController } from "@/controllers/health.controller";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();
router.get("/", requireAuth, healthController.get);

export default router;
