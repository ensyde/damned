import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requirePermission, requireAnyPermission } from "../middleware/permissions";
import { hashPassword } from "../utils/password";
import { notificationService } from "../services/notifications";

const router = Router();

// All routes require authentication + at least admin panel access
router.use(authenticate);
router.use(requireAnyPermission("admin.panel", "admin.users", "admin.ranks", "admin.reports"));

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  const [
    userCount,
    activeUserCount,
    threadCount,
    postCount,
    pendingDownloads,
    openReports,
    newUsersToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.thread.count({ where: { deletedAt: null } }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.download.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      userCount, activeUserCount, threadCount, postCount,
      pendingDownloads, openReports, newUsersToday,
    },
  });
});

// ─── List Users ───────────────────────────────────────────────────────────────
router.get(
  "/users",
  requirePermission("admin.users"),
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt((req.query.page as string) ?? "1");
    const perPage = parseInt((req.query.perPage as string) ?? "30");
    const search = req.query.search as string | undefined;

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { primaryRank: { select: { name: true, color: true } } },
        omit: { passwordHash: true },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page, perPage, totalPages: Math.ceil(total / perPage) } });
  }
);

// ─── Update User ──────────────────────────────────────────────────────────────
router.patch(
  "/users/:id",
  requirePermission("admin.users"),
  [
    body("status").optional().isIn(["ACTIVE", "BANNED", "SUSPENDED"]),
    body("banReason").optional().trim().isLength({ max: 500 }),
    body("primaryRankId").optional().notEmpty(),
    body("emailVerified").optional().isBoolean(),
    body("reputationPoints").optional().isInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { status, banReason, primaryRankId, emailVerified, reputationPoints } =
      req.body as Record<string, unknown>;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status: status as never }),
        ...(banReason !== undefined && { banReason: banReason as string }),
        ...(primaryRankId !== undefined && { primaryRankId: primaryRankId as string }),
        ...(emailVerified !== undefined && { emailVerified: emailVerified as boolean }),
        ...(reputationPoints !== undefined && { reputationPoints: reputationPoints as number }),
      },
      omit: { passwordHash: true },
    });

    // Notify user of rank change
    if (primaryRankId) {
      await notificationService.create({
        userId: user.id,
        type: "RANK_CHANGE",
        title: "Your rank has been updated",
        body: "An administrator has updated your rank.",
      });
    }

    res.json({ success: true, data: user });
  }
);

// ─── Manage Ranks ─────────────────────────────────────────────────────────────
router.get("/ranks", async (_req: Request, res: Response): Promise<void> => {
  const ranks = await prisma.rank.findMany({ orderBy: { priority: "desc" } });
  res.json({ success: true, data: ranks });
});

router.post(
  "/ranks",
  requirePermission("admin.ranks"),
  [
    body("name").trim().isLength({ min: 1, max: 50 }),
    body("color").matches(/^#[0-9a-fA-F]{6}$/),
    body("priority").isInt({ min: 0 }),
    body("permissions").isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { name, color, priority, permissions, badgeIcon, isDefault, isStaff } =
      req.body as {
        name: string;
        color: string;
        priority: number;
        permissions: string[];
        badgeIcon?: string;
        isDefault?: boolean;
        isStaff?: boolean;
      };

    if (isDefault) {
      await prisma.rank.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const rank = await prisma.rank.create({
      data: { name, color, priority, permissions, badgeIcon, isDefault: isDefault ?? false, isStaff: isStaff ?? false },
    });

    res.status(201).json({ success: true, data: rank });
  }
);

router.patch(
  "/ranks/:id",
  requirePermission("admin.ranks"),
  async (req: Request, res: Response): Promise<void> => {
    const { name, color, priority, permissions, badgeIcon, isDefault, isStaff } =
      req.body as Record<string, unknown>;

    if (isDefault) {
      await prisma.rank.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const rank = await prisma.rank.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name as string }),
        ...(color !== undefined && { color: color as string }),
        ...(priority !== undefined && { priority: priority as number }),
        ...(permissions !== undefined && { permissions: permissions as string[] }),
        ...(badgeIcon !== undefined && { badgeIcon: badgeIcon as string }),
        ...(isDefault !== undefined && { isDefault: isDefault as boolean }),
        ...(isStaff !== undefined && { isStaff: isStaff as boolean }),
      },
    });

    res.json({ success: true, data: rank });
  }
);

router.delete(
  "/ranks/:id",
  requirePermission("admin.ranks"),
  async (req: Request, res: Response): Promise<void> => {
    await prisma.rank.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Rank deleted" });
  }
);

// ─── Pending Downloads ────────────────────────────────────────────────────────
router.get("/downloads/pending", async (_req: Request, res: Response): Promise<void> => {
  const downloads = await prisma.download.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      category: true,
      uploader: { select: { id: true, username: true, email: true } },
    },
  });
  res.json({ success: true, data: downloads });
});

router.patch(
  "/downloads/:id/approve",
  requireAnyPermission("downloads.approve"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const download = await prisma.download.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", publishedAt: new Date(), approvedById: req.user!.sub },
    });

    await notificationService.create({
      userId: download.uploaderId,
      type: "DOWNLOAD_APPROVED",
      title: "Your download was approved",
      body: `"${download.title}" is now live.`,
      link: `/downloads/${download.slug}`,
    });

    res.json({ success: true, data: download });
  }
);

router.patch(
  "/downloads/:id/reject",
  requireAnyPermission("downloads.approve"),
  [body("reason").trim().isLength({ min: 1, max: 500 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const download = await prisma.download.update({
      where: { id: req.params.id },
      data: { status: "REJECTED", rejectionNote: req.body.reason as string },
    });

    await notificationService.create({
      userId: download.uploaderId,
      type: "DOWNLOAD_REJECTED",
      title: "Your download was rejected",
      body: `"${download.title}" was not approved. Reason: ${download.rejectionNote}`,
    });

    res.json({ success: true, data: download });
  }
);

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get(
  "/reports",
  requirePermission("admin.reports"),
  async (req: Request, res: Response): Promise<void> => {
    const reports = await prisma.report.findMany({
      where: { status: req.query.status === "resolved" ? "RESOLVED" : "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, username: true } },
        reportedUser: { select: { id: true, username: true } },
      },
    });
    res.json({ success: true, data: reports });
  }
);

router.patch(
  "/reports/:id",
  requirePermission("admin.reports"),
  async (req: Request, res: Response): Promise<void> => {
    const { status, resolution } = req.body as { status: string; resolution?: string };
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        status: status as never,
        ...(resolution && { resolution }),
      },
    });
    res.json({ success: true, data: report });
  }
);

// ─── System Broadcast ─────────────────────────────────────────────────────────
router.post(
  "/broadcast",
  requirePermission("admin.settings"),
  [body("message").trim().isLength({ min: 1, max: 500 })],
  async (req: Request, res: Response): Promise<void> => {
    const message = req.body.message as string;
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: "SYSTEM_BROADCAST" as never,
        title: "System Announcement",
        body: message,
      })),
    });

    res.json({ success: true, message: `Broadcast sent to ${users.length} users` });
  }
);

// ─── Site Settings ────────────────────────────────────────────────────────────
router.get("/settings", requirePermission("admin.settings"), async (_req: Request, res: Response): Promise<void> => {
  const settings = await prisma.siteSetting.findMany();
  const obj = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  res.json({ success: true, data: obj });
});

router.put(
  "/settings",
  requirePermission("admin.settings"),
  async (req: Request, res: Response): Promise<void> => {
    const settings = req.body as Record<string, string>;
    const upserts = Object.entries(settings).map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    );
    await prisma.$transaction(upserts);
    res.json({ success: true, message: "Settings updated" });
  }
);

// ─── Audit Log ────────────────────────────────────────────────────────────────
router.get("/audit-log", requirePermission("admin.settings"), async (req: Request, res: Response): Promise<void> => {
  const page = parseInt((req.query.page as string) ?? "1");
  const perPage = parseInt((req.query.perPage as string) ?? "50");

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auditLog.count(),
  ]);

  res.json({ success: true, data: { logs, total, page, perPage, totalPages: Math.ceil(total / perPage) } });
});

export default router;
