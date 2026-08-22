import { Router } from "express";
import { prisma } from "@/database/prisma";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

export default router;
