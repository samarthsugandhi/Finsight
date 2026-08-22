import { Router } from "express";
import { goalController } from "@/controllers/goal.controller";
import { validate } from "@/middlewares/validate.middleware";
import { createGoalSchema, updateGoalSchema, allocateSchema } from "@/validators/goal.validator";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

// Literal sub-paths registered before the /:id family to avoid any
// ambiguity with the parameterized routes below.
router.get("/available-savings", goalController.availableSavings);
router.post("/allocate", validate(allocateSchema), goalController.allocate);

router.post("/", validate(createGoalSchema), goalController.create);
router.get("/", goalController.list);
router.get("/:id/contributions", goalController.contributions);
router.patch("/:id", validate(updateGoalSchema), goalController.update);
router.delete("/:id", goalController.remove);

export default router;
