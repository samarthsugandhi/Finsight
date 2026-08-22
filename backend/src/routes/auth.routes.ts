import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { validate } from "@/middlewares/validate.middleware";
import { signupSchema, loginSchema, refreshSchema } from "@/validators/auth.validator";
import { authLimiter } from "@/middlewares/rateLimiters";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();

router.post("/signup", authLimiter, validate(signupSchema), authController.signup);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authLimiter, validate(refreshSchema), authController.refresh);
router.get("/me", requireAuth, authController.me);

export default router;
