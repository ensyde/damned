import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../config/prisma";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../utils/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  getRefreshExpiresAt,
  getTokenExpiresAt,
} from "../utils/jwt";
import { authenticate, AuthRequest } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { emailService } from "../services/email";
import { isValidEmail, isValidUsername } from "@damned/shared";

const router = Router();

// ─── Register ─────────────────────────────────────────────────────────────────
router.post(
  "/register",
  authLimiter,
  [
    body("username")
      .trim()
      .custom((v) => {
        if (!isValidUsername(v)) throw new Error("Invalid username (3-32 chars, alphanumeric/-/_)");
        return true;
      }),
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8, max: 128 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { username, email, password } = req.body as {
      username: string;
      email: string;
      password: string;
    };

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      res.status(400).json({ success: false, error: pwError });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      res.status(409).json({ success: false, error: "Username or email already taken" });
      return;
    }

    const defaultRank = await prisma.rank.findFirst({ where: { isDefault: true } });
    const passwordHash = await hashPassword(password);
    const verifyToken = generateSecureToken();

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        primaryRankId: defaultRank?.id,
        verificationTokens: {
          create: {
            token: verifyToken,
            expiresAt: getTokenExpiresAt(1440), // 24h
          },
        },
      },
    });

    await emailService.sendVerification(email, username, verifyToken);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: { id: user.id, username: user.username },
    });
  }
);

// ─── Verify Email ─────────────────────────────────────────────────────────────
router.post(
  "/verify-email",
  async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body as { token: string };
    if (!token) {
      res.status(400).json({ success: false, error: "Token required" });
      return;
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: "Invalid or expired token" });
      return;
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, status: "ACTIVE" },
      }),
    ]);

    res.json({ success: true, message: "Email verified successfully" });
  }
);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post(
  "/login",
  authLimiter,
  [
    body("login").trim().notEmpty(),
    body("password").notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: "Login and password required" });
      return;
    }

    const { login, password } = req.body as { login: string; password: string };
    const isEmail = isValidEmail(login);

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: login } : { username: login },
      include: {
        primaryRank: true,
        secondaryRanks: { include: { rank: true } },
      },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    if (user.status === "BANNED") {
      res.status(403).json({
        success: false,
        error: `Account banned: ${user.banReason ?? "Contact support"}`,
      });
      return;
    }

    if (user.status === "PENDING_VERIFICATION") {
      res.status(403).json({
        success: false,
        error: "Please verify your email before logging in",
      });
      return;
    }

    const permissions = [
      ...(user.primaryRank?.permissions ?? []),
      ...user.secondaryRanks.flatMap((sr) => sr.rank.permissions),
    ];

    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      permissions,
    });

    const refreshToken = signRefreshToken({ sub: user.id });
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiresAt(),
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          primaryRank: user.primaryRank,
          permissions,
        },
      },
    });
  }
);

// ─── Refresh Token ────────────────────────────────────────────────────────────
router.post(
  "/refresh",
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) {
      res.status(400).json({ success: false, error: "Refresh token required" });
      return;
    }

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      res.status(401).json({ success: false, error: "Invalid refresh token" });
      return;
    }

    const record = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      res.status(401).json({ success: false, error: "Refresh token revoked or expired" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        primaryRank: true,
        secondaryRanks: { include: { rank: true } },
      },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "User not found" });
      return;
    }

    const permissions = [
      ...(user.primaryRank?.permissions ?? []),
      ...user.secondaryRanks.flatMap((sr) => sr.rank.permissions),
    ];

    // Rotate refresh token
    const newRefresh = signRefreshToken({ sub: user.id });
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          token: newRefresh,
          userId: user.id,
          expiresAt: getRefreshExpiresAt(),
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        },
      }),
    ]);

    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      permissions,
    });

    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  }
);

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/logout", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }
  res.json({ success: true, message: "Logged out" });
});

// ─── Logout All Devices ───────────────────────────────────────────────────────
router.post(
  "/logout-all",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user!.sub },
      data: { revokedAt: new Date() },
    });
    res.json({ success: true, message: "Logged out from all devices" });
  }
);

// ─── Forgot Password ──────────────────────────────────────────────────────────
router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().normalizeEmail()],
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (user) {
      const token = generateSecureToken();
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt: getTokenExpiresAt(60), // 1 hour
        },
      });
      await emailService.sendPasswordReset(email, user.username, token);
    }

    res.json({
      success: true,
      message: "If that email exists, a reset link has been sent",
    });
  }
);

// ─── Reset Password ───────────────────────────────────────────────────────────
router.post(
  "/reset-password",
  authLimiter,
  [
    body("token").notEmpty(),
    body("password").isLength({ min: 8, max: 128 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0]?.msg });
      return;
    }

    const { token, password } = req.body as { token: string; password: string };
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Revoke all refresh tokens
      prisma.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { revokedAt: new Date() },
      }),
    ]);

    res.json({ success: true, message: "Password reset successful" });
  }
);

// ─── Get Current User ─────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: {
      primaryRank: true,
      secondaryRanks: { include: { rank: true } },
    },
    omit: { passwordHash: true },
  });

  if (!user) {
    res.status(404).json({ success: false, error: "User not found" });
    return;
  }

  const permissions = [
    ...(user.primaryRank?.permissions ?? []),
    ...user.secondaryRanks.flatMap((sr) => sr.rank.permissions),
  ];

  res.json({ success: true, data: { ...user, permissions } });
});

export default router;
