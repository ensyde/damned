import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { logger } from "./utils/logger";
import { prisma } from "./config/prisma";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import forumRoutes from "./routes/forum";
import downloadRoutes from "./routes/downloads";
import messageRoutes from "./routes/messages";
import notificationRoutes from "./routes/notifications";
import adminRoutes from "./routes/admin";
import pageRoutes from "./routes/pages";
import themeRoutes from "./routes/theme";
import discordRoutes from "./routes/discord";

export async function createApp(): Promise<Application> {
  const app = express();

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      credentials: true,
    })
  );

  // ── Parsing ───────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ───────────────────────────────────────────────────────────────
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/health", async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: "error" });
    }
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/forum", forumRoutes);
  app.use("/api/downloads", downloadRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/pages", pageRoutes);
  app.use("/api/theme", themeRoutes);
  app.use("/api/discord", discordRoutes);

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: "Not found" });
  });

  // ── Error handler ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(err.message, { stack: err.stack });
    res.status(500).json({ success: false, error: "Internal server error" });
  });

  return app;
}
