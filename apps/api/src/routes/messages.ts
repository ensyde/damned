import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { messageLimiter } from "../middleware/rateLimit";
import { socketService } from "../services/socket";

const router = Router();

// ─── List Conversations ───────────────────────────────────────────────────────
router.get("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt((req.query.page as string) ?? "1");
  const perPage = parseInt((req.query.perPage as string) ?? "20");

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: req.user!.sub, hasLeft: false },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    skip: (page - 1) * perPage,
    take: perPage,
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true, displayName: true, avatar: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const data = participations.map((p) => ({
    id: p.conversation.id,
    subject: p.conversation.subject,
    lastMessageAt: p.conversation.lastMessageAt,
    unreadCount: p.unreadCount,
    participants: p.conversation.participants
      .filter((cp) => cp.userId !== req.user!.sub)
      .map((cp) => cp.user),
    lastMessage: p.conversation.messages[0] ?? null,
  }));

  res.json({ success: true, data });
});

// ─── Start Conversation ───────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  requirePermission("messages.send"),
  messageLimiter,
  [
    body("recipientId").notEmpty(),
    body("subject").trim().isLength({ min: 1, max: 200 }),
    body("body").trim().isLength({ min: 1, max: 10000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { recipientId, subject, body: msgBody } = req.body as {
      recipientId: string;
      subject: string;
      body: string;
    };

    if (recipientId === req.user!.sub) {
      res.status(400).json({ success: false, error: "Cannot message yourself" });
      return;
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      res.status(404).json({ success: false, error: "Recipient not found" });
      return;
    }

    // Check block list
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: recipientId, blockedId: req.user!.sub },
          { blockerId: req.user!.sub, blockedId: recipientId },
        ],
      },
    });
    if (block) {
      res.status(403).json({ success: false, error: "Cannot send message to this user" });
      return;
    }

    const conversation = await prisma.conversation.create({
      data: {
        subject,
        participants: {
          create: [
            { userId: req.user!.sub },
            { userId: recipientId, unreadCount: 1 },
          ],
        },
        messages: {
          create: { body: msgBody, senderId: req.user!.sub },
        },
      },
      include: {
        participants: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    // Real-time delivery
    socketService.emitToUser(recipientId, "message", {
      conversationId: conversation.id,
      message: {
        id: conversation.messages[0]!.id,
        body: conversation.messages[0]!.body,
        sender: { id: req.user!.sub, username: req.user!.username } as never,
        createdAt: conversation.messages[0]!.createdAt,
      },
    });

    res.status(201).json({ success: true, data: conversation });
  }
);

// ─── Get Conversation Messages ────────────────────────────────────────────────
router.get("/:id", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: req.params.id,
        userId: req.user!.sub,
      },
    },
  });

  if (!participant || participant.hasLeft) {
    res.status(404).json({ success: false, error: "Conversation not found" });
    return;
  }

  const page = parseInt((req.query.page as string) ?? "1");
  const perPage = parseInt((req.query.perPage as string) ?? "30");

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: req.params.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    }),
    prisma.message.count({
      where: { conversationId: req.params.id, status: "ACTIVE" },
    }),
  ]);

  // Mark as read
  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { unreadCount: 0 },
  });

  res.json({
    success: true,
    data: { messages, total, page, perPage, totalPages: Math.ceil(total / perPage) },
  });
});

// ─── Reply to Conversation ────────────────────────────────────────────────────
router.post(
  "/:id/reply",
  authenticate,
  requirePermission("messages.send"),
  messageLimiter,
  [body("body").trim().isLength({ min: 1, max: 10000 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.sub } },
    });

    if (!participant || participant.hasLeft) {
      res.status(404).json({ success: false, error: "Conversation not found" });
      return;
    }

    const message = await prisma.message.create({
      data: {
        body: req.body.body as string,
        conversationId: req.params.id,
        senderId: req.user!.sub,
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { lastMessageAt: new Date() },
    });

    // Increment unread for other participants
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: req.params.id, userId: { not: req.user!.sub } },
      data: { unreadCount: { increment: 1 } },
    });

    // Real-time delivery to other participants
    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId: req.params.id, userId: { not: req.user!.sub }, hasLeft: false },
    });

    for (const other of others) {
      socketService.emitToUser(other.userId, "message", {
        conversationId: req.params.id,
        message: {
          id: message.id,
          body: message.body,
          sender: message.sender as never,
          createdAt: message.createdAt,
        },
      });
    }

    res.status(201).json({ success: true, data: message });
  }
);

// ─── Leave Conversation ───────────────────────────────────────────────────────
router.delete("/:id/leave", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.sub } },
    data: { hasLeft: true },
  });
  res.json({ success: true, message: "Left conversation" });
});

export default router;
