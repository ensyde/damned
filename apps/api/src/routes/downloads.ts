import { Router, Request, Response } from "express";
import { body, query, validationResult } from "express-validator";
import multer from "multer";
import { prisma } from "../config/prisma";
import { authenticate, optionalAuth, AuthRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { uploadLimiter } from "../middleware/rateLimit";
import { storageService } from "../services/storage";
import { notificationService } from "../services/notifications";
import { slugify } from "@damned/shared";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// ─── List Downloads ───────────────────────────────────────────────────────────
router.get(
  "/",
  optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const page = parseInt((req.query.page as string) ?? "1");
    const perPage = parseInt((req.query.perPage as string) ?? "20");
    const categorySlug = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const where = {
      status: "APPROVED" as const,
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(search && { title: { contains: search, mode: "insensitive" as const } }),
    };

    const [downloads, total] = await Promise.all([
      prisma.download.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          uploader: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.download.count({ where }),
    ]);

    res.json({
      success: true,
      data: { downloads, total, page, perPage, totalPages: Math.ceil(total / perPage) },
    });
  }
);

// ─── Get Single Download ──────────────────────────────────────────────────────
router.get("/:slug", optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const download = await prisma.download.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: true,
      uploader: { select: { id: true, username: true, displayName: true, avatar: true } },
      reviews: {
        include: { user: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!download || download.deletedAt) {
    res.status(404).json({ success: false, error: "Download not found" });
    return;
  }

  // Check category permission
  if (
    download.category.requiredPermission &&
    !req.user?.permissions.includes(download.category.requiredPermission)
  ) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  const avgRating =
    download.reviews.length > 0
      ? download.reviews.reduce((s, r) => s + r.rating, 0) / download.reviews.length
      : null;

  res.json({
    success: true,
    data: { ...download, averageRating: avgRating },
  });
});

// ─── Upload Download ──────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  requirePermission("downloads.upload"),
  uploadLimiter,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "screenshots", maxCount: 5 },
  ]),
  [
    body("title").trim().isLength({ min: 3, max: 200 }),
    body("description").trim().isLength({ min: 10, max: 10000 }),
    body("categoryId").notEmpty(),
    body("version").optional().trim().isLength({ max: 50 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const files = req.files as Record<string, Express.Multer.File[]>;
    const mainFile = files?.file?.[0];
    if (!mainFile) {
      res.status(400).json({ success: false, error: "File is required" });
      return;
    }

    const { title, description, categoryId, version } = req.body as {
      title: string;
      description: string;
      categoryId: string;
      version?: string;
    };

    const category = await prisma.downloadCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(404).json({ success: false, error: "Category not found" });
      return;
    }

    let slug = slugify(title);
    const existing = await prisma.download.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const fileKey = `downloads/${req.user!.sub}/${Date.now()}/${mainFile.originalname}`;
    const fileUrl = await storageService.upload(fileKey, mainFile.buffer, mainFile.mimetype);

    const screenshotUrls: string[] = [];
    for (const ss of files?.screenshots ?? []) {
      const ssKey = `downloads/${req.user!.sub}/screenshots/${Date.now()}/${ss.originalname}`;
      screenshotUrls.push(await storageService.upload(ssKey, ss.buffer, ss.mimetype));
    }

    const download = await prisma.download.create({
      data: {
        title,
        slug,
        description,
        version,
        fileUrl,
        fileSize: BigInt(mainFile.size),
        fileName: mainFile.originalname,
        screenshots: screenshotUrls,
        categoryId,
        uploaderId: req.user!.sub,
      },
    });

    res.status(201).json({
      success: true,
      message: "Upload submitted for review",
      data: download,
    });
  }
);

// ─── Download File (increment counter) ───────────────────────────────────────
router.post(
  "/:slug/download",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const download = await prisma.download.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });

    if (!download || download.status !== "APPROVED" || download.deletedAt) {
      res.status(404).json({ success: false, error: "Download not found" });
      return;
    }

    if (
      download.category.requiredPermission &&
      !req.user!.permissions.includes(download.category.requiredPermission)
    ) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    await prisma.download.update({
      where: { id: download.id },
      data: { downloadCount: { increment: 1 } },
    });

    // Return presigned URL or direct URL
    const url = await storageService.getSignedUrl(download.fileUrl);
    res.json({ success: true, data: { url } });
  }
);

// ─── Review Download ──────────────────────────────────────────────────────────
router.post(
  "/:slug/reviews",
  authenticate,
  [
    body("rating").isInt({ min: 1, max: 5 }),
    body("body").optional().trim().isLength({ max: 2000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const download = await prisma.download.findUnique({ where: { slug: req.params.slug } });
    if (!download || download.status !== "APPROVED") {
      res.status(404).json({ success: false, error: "Download not found" });
      return;
    }

    const review = await prisma.downloadReview.upsert({
      where: { downloadId_userId: { downloadId: download.id, userId: req.user!.sub } },
      create: {
        downloadId: download.id,
        userId: req.user!.sub,
        rating: req.body.rating as number,
        body: req.body.body as string | undefined,
      },
      update: {
        rating: req.body.rating as number,
        body: req.body.body as string | undefined,
      },
    });

    res.json({ success: true, data: review });
  }
);

// ─── List Download Categories ─────────────────────────────────────────────────
router.get("/categories/list", async (_req: Request, res: Response): Promise<void> => {
  const categories = await prisma.downloadCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { downloads: true } } },
  });
  res.json({ success: true, data: categories });
});

export default router;
