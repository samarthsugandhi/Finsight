import { Router } from "express";
import { aiController } from "@/controllers/ai.controller";
import { requireAuth } from "@/middlewares/auth.middleware";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(requireAuth);

router.post("/chat", aiController.chat);
router.post("/parse-statement", upload.single("file"), aiController.parseStatement);
router.post("/import-statement", aiController.importStatement);

export default router;