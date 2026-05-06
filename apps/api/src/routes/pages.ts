import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

const router = Router();

// ─── List Published Pages ─────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const pages = await prisma.staticPage.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { navOrder: "asc" },
    select: { id: true, title: true, slug: true, showInNav: true, navLabel: true, navOrder: true },
  });
  res.json({ success: true, data: pages });
});

// ─── Get Page by Slug ─────────────────────────────────────────────────────────
router.get("/:slug", async (req: Request, res: Response): Promise<void> => {
  const page = await prisma.staticPage.findUnique({ where: { slug: req.params.slug } });
  if (!page || page.status === "DRAFT") {
    res.status(404).json({ success: false, error: "Page not found" });
    return;
  }
  res.json({ success: true, data: page });
});

// ─── Create Page (admin) ──────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  requirePermission("static_pages.edit"),
  [
    body("title").trim().isLength({ min: 1, max: 200 }),
    body("slug")
      .trim()
      .matches(/^[a-z0-9-]+$/)
      .isLength({ min: 1, max: 100 }),
    body("content").notEmpty(),
    body("status").optional().isIn(["PUBLISHED", "DRAFT"]),
    body("showInNav").optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { title, slug, content, status, showInNav, navLabel, navOrder, metaTitle, metaDesc, ogImage } =
      req.body as {
        title: string;
        slug: string;
        content: string;
        status?: "PUBLISHED" | "DRAFT";
        showInNav?: boolean;
        navLabel?: string;
        navOrder?: number;
        metaTitle?: string;
        metaDesc?: string;
        ogImage?: string;
      };

    const existing = await prisma.staticPage.findUnique({ where: { slug } });
    if (existing) {
      res.status(409).json({ success: false, error: "Slug already in use" });
      return;
    }

    const page = await prisma.staticPage.create({
      data: {
        title,
        slug,
        content,
        status: status ?? "DRAFT",
        showInNav: showInNav ?? false,
        navLabel,
        navOrder: navOrder ?? 0,
        metaTitle,
        metaDesc,
        ogImage,
        ...(status === "PUBLISHED" && { publishedAt: new Date() }),
      },
    });

    res.status(201).json({ success: true, data: page });
  }
);

// ─── Update Page ──────────────────────────────────────────────────────────────
router.patch(
  "/:id",
  authenticate,
  requirePermission("static_pages.edit"),
  async (req: Request, res: Response): Promise<void> => {
    const { title, content, status, showInNav, navLabel, navOrder, metaTitle, metaDesc, ogImage } =
      req.body as Record<string, unknown>;

    const existing = await prisma.staticPage.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ success: false, error: "Page not found" });
      return;
    }

    const page = await prisma.staticPage.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: title as string }),
        ...(content !== undefined && { content: content as string }),
        ...(status !== undefined && { status: status as never }),
        ...(showInNav !== undefined && { showInNav: showInNav as boolean }),
        ...(navLabel !== undefined && { navLabel: navLabel as string }),
        ...(navOrder !== undefined && { navOrder: navOrder as number }),
        ...(metaTitle !== undefined && { metaTitle: metaTitle as string }),
        ...(metaDesc !== undefined && { metaDesc: metaDesc as string }),
        ...(ogImage !== undefined && { ogImage: ogImage as string }),
        ...(status === "PUBLISHED" && !existing.publishedAt && { publishedAt: new Date() }),
      },
    });

    res.json({ success: true, data: page });
  }
);

// ─── Delete Page ──────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  requirePermission("static_pages.edit"),
  async (req: Request, res: Response): Promise<void> => {
    await prisma.staticPage.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Page deleted" });
  }
);

// ─── List All Pages (admin) ───────────────────────────────────────────────────
router.get(
  "/admin/all",
  authenticate,
  requirePermission("static_pages.edit"),
  async (_req: Request, res: Response): Promise<void> => {
    const pages = await prisma.staticPage.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, data: pages });
  }
);

export default router;
