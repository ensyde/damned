import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { NotificationType } from "@damned/db";

const router = Router();

// ─── List Notifications ───────────────────────────────────────────────────────
router.get("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt((req.query.page as string) ?? "1");
  const perPage = parseInt((req.query.perPage as string) ?? "20");
  const unreadOnly = req.query.unreadOnly === "true";

  const where = {
    userId: req.user!.sub,
    ...(unreadOnly && { isRead: false }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user!.sub, isRead: false } }),
  ]);

  res.json({
    success: true,
    data: { notifications, total, page, perPage, totalPages: Math.ceil(total / perPage), unreadCount },
  });
});

// ─── Mark Read ────────────────────────────────────────────────────────────────
router.patch("/:id/read", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.sub },
    data: { isRead: true },
  });
  res.json({ success: true });
});

// ─── Mark All Read ────────────────────────────────────────────────────────────
router.post(
  "/mark-all-read",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: "All notifications marked as read" });
  }
);

// ─── Get Notification Preferences ────────────────────────────────────────────
router.get(
  "/preferences",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: req.user!.sub },
    });
    res.json({ success: true, data: prefs });
  }
);

// ─── Update Notification Preferences ─────────────────────────────────────────
router.put(
  "/preferences",
  authenticate,
  [body("preferences").isArray()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: "Invalid preferences" });
      return;
    }

    const prefs = req.body.preferences as Array<{
      type: NotificationType;
      inApp: boolean;
      email: boolean;
    }>;

    const upserts = prefs.map((p) =>
      prisma.notificationPreference.upsert({
        where: { userId_type: { userId: req.user!.sub, type: p.type } },
        create: { userId: req.user!.sub, type: p.type, inApp: p.inApp, email: p.email },
        update: { inApp: p.inApp, email: p.email },
      })
    );

    await prisma.$transaction(upserts);
    res.json({ success: true, message: "Preferences updated" });
  }
);

export default router;
