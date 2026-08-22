import { Router } from "express";
import { transactionController } from "@/controllers/transaction.controller";
import { validate } from "@/middlewares/validate.middleware";
import { createTransactionSchema, listTransactionsSchema, updateTransactionSchema } from "@/validators/transaction.validator";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

router.post("/", validate(createTransactionSchema), transactionController.create);
router.get("/", validate(listTransactionsSchema), transactionController.list);
router.get("/summary", transactionController.summary);
router.patch("/:id", validate(updateTransactionSchema), transactionController.update);
router.delete("/:id", transactionController.remove);


export default router;
