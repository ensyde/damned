import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import multer from "multer";
import { storageService } from "../services/storage";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// ─── Get Active Theme ─────────────────────────────────────────────────────────
router.get("/active", async (_req: Request, res: Response): Promise<void> => {
  const theme = await prisma.theme.findFirst({ where: { isActive: true } });
  res.json({ success: true, data: theme });
});

// ─── List Themes ──────────────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const themes = await prisma.theme.findMany({ orderBy: { createdAt: "asc" } });
  res.json({ success: true, data: themes });
});

// ─── Create Theme ─────────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  requirePermission("theme.edit"),
  [
    body("name").trim().isLength({ min: 1, max: 100 }),
    body("primaryColor").matches(/^#[0-9a-fA-F]{6}$/),
    body("accentColor").matches(/^#[0-9a-fA-F]{6}$/),
    body("bgColor").matches(/^#[0-9a-fA-F]{6}$/),
    body("surfaceColor").matches(/^#[0-9a-fA-F]{6}$/),
    body("textColor").matches(/^#[0-9a-fA-F]{6}$/),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { name, primaryColor, accentColor, bgColor, surfaceColor, textColor, fontFamily, borderRadius } =
      req.body as {
        name: string;
        primaryColor: string;
        accentColor: string;
        bgColor: string;
        surfaceColor: string;
        textColor: string;
        fontFamily?: string;
        borderRadius?: string;
      };

    const theme = await prisma.theme.create({
      data: { name, primaryColor, accentColor, bgColor, surfaceColor, textColor, fontFamily, borderRadius },
    });

    res.status(201).json({ success: true, data: theme });
  }
);

// ─── Update Theme ─────────────────────────────────────────────────────────────
router.patch(
  "/:id",
  authenticate,
  requirePermission("theme.edit"),
  async (req: Request, res: Response): Promise<void> => {
    const theme = await prisma.theme.update({
      where: { id: req.params.id },
      data: req.body as Record<string, unknown>,
    });
    res.json({ success: true, data: theme });
  }
);

// ─── Activate Theme ───────────────────────────────────────────────────────────
router.post(
  "/:id/activate",
  authenticate,
  requirePermission("theme.edit"),
  async (req: Request, res: Response): Promise<void> => {
    await prisma.$transaction([
      prisma.theme.updateMany({ where: {}, data: { isActive: false } }),
      prisma.theme.update({ where: { id: req.params.id }, data: { isActive: true } }),
    ]);
    const theme = await prisma.theme.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: theme });
  }
);

// ─── Upload Logo / Favicon ────────────────────────────────────────────────────
router.post(
  "/:id/logo",
  authenticate,
  requirePermission("theme.edit"),
  upload.single("logo"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file" });
      return;
    }
    const url = await storageService.upload(`themes/logos/${Date.now()}`, req.file.buffer, req.file.mimetype);
    const theme = await prisma.theme.update({ where: { id: req.params.id }, data: { logoUrl: url } });
    res.json({ success: true, data: { logoUrl: theme.logoUrl } });
  }
);

router.post(
  "/:id/favicon",
  authenticate,
  requirePermission("theme.edit"),
  upload.single("favicon"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file" });
      return;
    }
    const url = await storageService.upload(`themes/favicons/${Date.now()}`, req.file.buffer, req.file.mimetype);
    const theme = await prisma.theme.update({ where: { id: req.params.id }, data: { faviconUrl: url } });
    res.json({ success: true, data: { faviconUrl: theme.faviconUrl } });
  }
);

// ─── Delete Theme ─────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  requirePermission("theme.edit"),
  async (req: Request, res: Response): Promise<void> => {
    const theme = await prisma.theme.findUnique({ where: { id: req.params.id } });
    if (theme?.isActive) {
      res.status(400).json({ success: false, error: "Cannot delete the active theme" });
      return;
    }
    await prisma.theme.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Theme deleted" });
  }
);

export default router;
