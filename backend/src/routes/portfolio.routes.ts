import { Router } from "express";
import { portfolioController } from "@/controllers/portfolio.controller";
import { validate } from "@/middlewares/validate.middleware";
import { addHoldingSchema, addTransactionSchema, updateManualPriceSchema } from "@/validators/portfolio.validator";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

router.get("/market-status", portfolioController.marketStatus);

router.post("/", validate(addHoldingSchema), portfolioController.addHolding);
router.get("/", portfolioController.list);
router.delete("/:id", portfolioController.remove);

router.post("/:id/transactions", validate(addTransactionSchema), portfolioController.addTransaction);
router.get("/:id/transactions", portfolioController.getTransactions);

router.patch("/:id/manual-price", validate(updateManualPriceSchema), portfolioController.updateManualPrice);

export default router;
