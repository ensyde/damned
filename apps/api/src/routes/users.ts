import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { storageService } from "../services/storage";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Get User Profile ─────────────────────────────────────────────────────────
router.get(
  "/:username",
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: {
        primaryRank: true,
        secondaryRanks: { include: { rank: true } },
        _count: { select: { posts: true, downloads: true, followers: true, following: true } },
      },
      omit: { passwordHash: true, email: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    if (!user.isPublicProfile) {
      res.status(403).json({ success: false, error: "This profile is private" });
      return;
    }

    // Recent activity
    const recentPosts = await prisma.post.findMany({
      where: { authorId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { thread: { select: { id: true, title: true, slug: true } } },
    });

    const recentDownloads = await prisma.download.findMany({
      where: { uploaderId: user.id, status: "APPROVED" },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, publishedAt: true },
    });

    res.json({
      success: true,
      data: { ...user, recentPosts, recentDownloads },
    });
  }
);

// ─── Update Own Profile ───────────────────────────────────────────────────────
router.patch(
  "/me/profile",
  authenticate,
  [
    body("displayName").optional().trim().isLength({ max: 50 }),
    body("bio").optional().trim().isLength({ max: 2000 }),
    body("website").optional().trim().isURL().isLength({ max: 200 }),
    body("location").optional().trim().isLength({ max: 100 }),
    body("socialLinks").optional().isObject(),
    body("isPublicProfile").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { displayName, bio, website, location, socialLinks, isPublicProfile } =
      req.body as Record<string, unknown>;

    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: {
        ...(displayName !== undefined && { displayName: displayName as string }),
        ...(bio !== undefined && { bio: bio as string }),
        ...(website !== undefined && { website: website as string }),
        ...(location !== undefined && { location: location as string }),
        ...(socialLinks !== undefined && { socialLinks }),
        ...(isPublicProfile !== undefined && { isPublicProfile: isPublicProfile as boolean }),
      },
      omit: { passwordHash: true },
    });

    res.json({ success: true, data: user });
  }
);

// ─── Upload Avatar ────────────────────────────────────────────────────────────
router.post(
  "/me/avatar",
  authenticate,
  upload.single("avatar"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }

    const url = await storageService.upload(
      `avatars/${req.user!.sub}/${Date.now()}`,
      req.file.buffer,
      req.file.mimetype
    );

    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { avatar: url },
      omit: { passwordHash: true },
    });

    res.json({ success: true, data: { avatar: user.avatar } });
  }
);

// ─── Upload Cover Photo ───────────────────────────────────────────────────────
router.post(
  "/me/cover",
  authenticate,
  upload.single("cover"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }

    const url = await storageService.upload(
      `covers/${req.user!.sub}/${Date.now()}`,
      req.file.buffer,
      req.file.mimetype
    );

    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { coverPhoto: url },
      omit: { passwordHash: true },
    });

    res.json({ success: true, data: { coverPhoto: user.coverPhoto } });
  }
);

// ─── Change Password ──────────────────────────────────────────────────────────
router.post(
  "/me/change-password",
  authenticate,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8, max: 128 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user?.passwordHash) {
      res.status(400).json({ success: false, error: "No password set" });
      return;
    }

    const { verifyPassword, hashPassword } = await import("../utils/password");
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ success: false, error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    res.json({ success: true, message: "Password changed successfully" });
  }
);

// ─── Follow / Unfollow ────────────────────────────────────────────────────────
router.post(
  "/:username/follow",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const target = await prisma.user.findUnique({
      where: { username: req.params.username },
    });

    if (!target) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    if (target.id === req.user!.sub) {
      res.status(400).json({ success: false, error: "Cannot follow yourself" });
      return;
    }

    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId: req.user!.sub, followingId: target.id } },
    });

    if (existing) {
      await prisma.userFollow.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { following: false } });
    } else {
      await prisma.userFollow.create({
        data: { followerId: req.user!.sub, followingId: target.id },
      });
      res.json({ success: true, data: { following: true } });
    }
  }
);

// ─── Block / Unblock ──────────────────────────────────────────────────────────
router.post(
  "/:username/block",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const target = await prisma.user.findUnique({
      where: { username: req.params.username },
    });

    if (!target) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const existing = await prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: req.user!.sub, blockedId: target.id } },
    });

    if (existing) {
      await prisma.userBlock.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { blocked: false } });
    } else {
      await prisma.userBlock.create({
        data: { blockerId: req.user!.sub, blockedId: target.id },
      });
      res.json({ success: true, data: { blocked: true } });
    }
  }
);

// ─── Search Users ─────────────────────────────────────────────────────────────
router.get(
  "/",
  [query("q").trim().isLength({ min: 1 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const q = (req.query.q as string) ?? "";
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
        status: "ACTIVE",
      },
      take: 20,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        primaryRank: { select: { name: true, color: true } },
      },
    });

    res.json({ success: true, data: users });
  }
);

export default router;
