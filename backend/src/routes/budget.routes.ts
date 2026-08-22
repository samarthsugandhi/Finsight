import { Router } from "express";
import { budgetController } from "@/controllers/budget.controller";
import { validate } from "@/middlewares/validate.middleware";
import { upsertBudgetSchema } from "@/validators/budget.validator";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

router.post("/", validate(upsertBudgetSchema), budgetController.upsert);
router.get("/", budgetController.list);
router.delete("/:id", budgetController.remove);

export default router;
