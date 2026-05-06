import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { authenticate, optionalAuth, AuthRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { slugify } from "@damned/shared";
import { notificationService } from "../services/notifications";

const router = Router();

// ─── Categories ───────────────────────────────────────────────────────────────

router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  const categories = await prisma.forumCategory.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
    include: {
      subforums: {
        where: { isVisible: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { threads: true } },
        },
      },
    },
  });
  res.json({ success: true, data: categories });
});

// ─── Subforum ─────────────────────────────────────────────────────────────────

router.get(
  "/subforums/:slug",
  optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const subforum = await prisma.subforum.findUnique({
      where: { slug: req.params.slug },
      include: { category: true, children: true },
    });

    if (!subforum) {
      res.status(404).json({ success: false, error: "Subforum not found" });
      return;
    }

    if (subforum.requiredPermission && !req.user?.permissions.includes(subforum.requiredPermission)) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    const page = parseInt((req.query.page as string) ?? "1");
    const perPage = parseInt((req.query.perPage as string) ?? "25");

    const [threads, total] = await Promise.all([
      prisma.thread.findMany({
        where: { subforumId: subforum.id, deletedAt: null },
        orderBy: [{ isPinned: "desc" }, { lastPostAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          author: {
            select: {
              id: true, username: true, displayName: true, avatar: true,
              primaryRank: { select: { name: true, color: true } },
            },
          },
          _count: { select: { posts: true } },
        },
      }),
      prisma.thread.count({ where: { subforumId: subforum.id, deletedAt: null } }),
    ]);

    res.json({
      success: true,
      data: { subforum, threads, total, page, perPage, totalPages: Math.ceil(total / perPage) },
    });
  }
);

// ─── Create Thread ────────────────────────────────────────────────────────────
router.post(
  "/subforums/:slug/threads",
  authenticate,
  requirePermission("forum.post"),
  [
    body("title").trim().isLength({ min: 3, max: 200 }),
    body("body").trim().isLength({ min: 1, max: 50000 }),
    body("tags").optional().isArray().isLength({ max: 5 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const subforum = await prisma.subforum.findUnique({ where: { slug: req.params.slug } });
    if (!subforum) {
      res.status(404).json({ success: false, error: "Subforum not found" });
      return;
    }

    if (subforum.isLocked && !req.user!.permissions.includes("forum.moderate")) {
      res.status(403).json({ success: false, error: "This subforum is locked" });
      return;
    }

    const { title, body: postBody, tags } = req.body as {
      title: string;
      body: string;
      tags?: string[];
    };

    let slug = slugify(title);
    const existing = await prisma.thread.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const thread = await prisma.thread.create({
      data: {
        title,
        slug,
        tags: tags ?? [],
        subforumId: subforum.id,
        authorId: req.user!.sub,
        posts: {
          create: {
            body: postBody,
            isFirst: true,
            authorId: req.user!.sub,
          },
        },
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
        posts: true,
      },
    });

    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { postCount: { increment: 1 } },
    });

    res.status(201).json({ success: true, data: thread });
  }
);

// ─── Get Thread ───────────────────────────────────────────────────────────────
router.get(
  "/threads/:slug",
  optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const thread = await prisma.thread.findUnique({
      where: { slug: req.params.slug },
      include: {
        subforum: { include: { category: true } },
        author: {
          select: {
            id: true, username: true, displayName: true, avatar: true,
            primaryRank: { select: { name: true, color: true, badgeIcon: true } },
            postCount: true, reputationPoints: true, createdAt: true,
          },
        },
      },
    });

    if (!thread || thread.deletedAt) {
      res.status(404).json({ success: false, error: "Thread not found" });
      return;
    }

    // Check permission for staff-only subforums
    if (
      thread.subforum.requiredPermission &&
      !req.user?.permissions.includes(thread.subforum.requiredPermission)
    ) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    // Increment view count
    await prisma.thread.update({
      where: { id: thread.id },
      data: { viewCount: { increment: 1 } },
    });

    const page = parseInt((req.query.page as string) ?? "1");
    const perPage = parseInt((req.query.perPage as string) ?? "20");

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          author: {
            select: {
              id: true, username: true, displayName: true, avatar: true,
              primaryRank: { select: { name: true, color: true, badgeIcon: true } },
              postCount: true, reputationPoints: true, createdAt: true,
            },
          },
          reactions: {
            include: { user: { select: { id: true, username: true } } },
          },
          editHistory: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { editor: { select: { username: true } } },
          },
        },
      }),
      prisma.post.count({ where: { threadId: thread.id } }),
    ]);

    // Check subscription
    let isSubscribed = false;
    if (req.user) {
      const sub = await prisma.threadSubscription.findUnique({
        where: { threadId_userId: { threadId: thread.id, userId: req.user.sub } },
      });
      isSubscribed = !!sub;
    }

    res.json({
      success: true,
      data: { thread, posts, total, page, perPage, totalPages: Math.ceil(total / perPage), isSubscribed },
    });
  }
);

// ─── Reply to Thread ──────────────────────────────────────────────────────────
router.post(
  "/threads/:slug/posts",
  authenticate,
  requirePermission("forum.post"),
  [body("body").trim().isLength({ min: 1, max: 50000 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const thread = await prisma.thread.findUnique({ where: { slug: req.params.slug } });
    if (!thread || thread.deletedAt) {
      res.status(404).json({ success: false, error: "Thread not found" });
      return;
    }

    if (thread.isLocked && !req.user!.permissions.includes("forum.moderate")) {
      res.status(403).json({ success: false, error: "Thread is locked" });
      return;
    }

    const post = await prisma.post.create({
      data: {
        body: req.body.body as string,
        threadId: thread.id,
        authorId: req.user!.sub,
      },
      include: {
        author: {
          select: {
            id: true, username: true, displayName: true, avatar: true,
            primaryRank: { select: { name: true, color: true } },
            postCount: true,
          },
        },
      },
    });

    await Promise.all([
      prisma.thread.update({
        where: { id: thread.id },
        data: { replyCount: { increment: 1 }, lastPostAt: new Date() },
      }),
      prisma.user.update({
        where: { id: req.user!.sub },
        data: { postCount: { increment: 1 } },
      }),
    ]);

    // Notify thread subscribers
    const subscriptions = await prisma.threadSubscription.findMany({
      where: { threadId: thread.id, userId: { not: req.user!.sub } },
    });
    for (const sub of subscriptions) {
      await notificationService.create({
        userId: sub.userId,
        type: "FORUM_REPLY",
        title: `New reply in: ${thread.title}`,
        body: `${req.user!.username} replied to a thread you are subscribed to.`,
        link: `/forum/threads/${thread.slug}`,
      });
    }

    res.status(201).json({ success: true, data: post });
  }
);

// ─── Edit Post ────────────────────────────────────────────────────────────────
router.patch(
  "/posts/:id",
  authenticate,
  [body("body").trim().isLength({ min: 1, max: 50000 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.deletedAt) {
      res.status(404).json({ success: false, error: "Post not found" });
      return;
    }

    const isOwner = post.authorId === req.user!.sub;
    const isMod = req.user!.permissions.includes("forum.moderate");

    if (!isOwner && !isMod) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    await prisma.postEditHistory.create({
      data: {
        postId: post.id,
        editorId: req.user!.sub,
        bodyBefore: post.body,
        bodyAfter: req.body.body as string,
      },
    });

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: { body: req.body.body as string },
    });

    res.json({ success: true, data: updated });
  }
);

// ─── Delete Post ──────────────────────────────────────────────────────────────
router.delete(
  "/posts/:id",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.deletedAt) {
      res.status(404).json({ success: false, error: "Post not found" });
      return;
    }

    const isOwner = post.authorId === req.user!.sub;
    const isMod = req.user!.permissions.includes("forum.delete");

    if (!isOwner && !isMod) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    await prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } });
    res.json({ success: true, message: "Post deleted" });
  }
);

// ─── React to Post ────────────────────────────────────────────────────────────
router.post(
  "/posts/:id/react",
  authenticate,
  [body("emoji").trim().notEmpty().isLength({ max: 10 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { emoji } = req.body as { emoji: string };
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) {
      res.status(404).json({ success: false, error: "Post not found" });
      return;
    }

    const existing = await prisma.postReaction.findUnique({
      where: { postId_userId_emoji: { postId: post.id, userId: req.user!.sub, emoji } },
    });

    if (existing) {
      await prisma.postReaction.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { reacted: false } });
    } else {
      await prisma.postReaction.create({
        data: { postId: post.id, userId: req.user!.sub, emoji },
      });
      res.json({ success: true, data: { reacted: true } });
    }
  }
);

// ─── Subscribe to Thread ──────────────────────────────────────────────────────
router.post(
  "/threads/:slug/subscribe",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const thread = await prisma.thread.findUnique({ where: { slug: req.params.slug } });
    if (!thread) {
      res.status(404).json({ success: false, error: "Thread not found" });
      return;
    }

    const existing = await prisma.threadSubscription.findUnique({
      where: { threadId_userId: { threadId: thread.id, userId: req.user!.sub } },
    });

    if (existing) {
      await prisma.threadSubscription.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { subscribed: false } });
    } else {
      await prisma.threadSubscription.create({
        data: { threadId: thread.id, userId: req.user!.sub },
      });
      res.json({ success: true, data: { subscribed: true } });
    }
  }
);

// ─── Moderate Thread ──────────────────────────────────────────────────────────
router.patch(
  "/threads/:slug/moderate",
  authenticate,
  requirePermission("forum.moderate"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { isPinned, isLocked, isSticky } = req.body as {
      isPinned?: boolean;
      isLocked?: boolean;
      isSticky?: boolean;
    };

    const thread = await prisma.thread.update({
      where: { slug: req.params.slug },
      data: {
        ...(isPinned !== undefined && { isPinned }),
        ...(isLocked !== undefined && { isLocked }),
        ...(isSticky !== undefined && { isSticky }),
      },
    });

    res.json({ success: true, data: thread });
  }
);

// ─── Search ───────────────────────────────────────────────────────────────────
router.get("/search", async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) {
    res.status(400).json({ success: false, error: "Query too short" });
    return;
  }

  const [threads, posts] = await Promise.all([
    prisma.thread.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      },
      take: 10,
      include: {
        author: { select: { username: true, avatar: true } },
        subforum: { select: { name: true, slug: true } },
      },
    }),
    prisma.post.findMany({
      where: {
        deletedAt: null,
        body: { contains: q, mode: "insensitive" },
      },
      take: 10,
      include: {
        author: { select: { username: true, avatar: true } },
        thread: { select: { title: true, slug: true } },
      },
    }),
  ]);

  res.json({ success: true, data: { threads, posts } });
});

export default router;
