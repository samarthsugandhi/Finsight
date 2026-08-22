import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { askInsightSchema } from "@/validators/insight.validator";
import { insightController } from "@/controllers/insight.controller";

const router = Router();

router.use(requireAuth);
router.post("/ask", validate(askInsightSchema), insightController.ask);

export default router;