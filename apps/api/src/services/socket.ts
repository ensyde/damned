import { Server as HTTPServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { logger } from "../utils/logger";

let io: SocketServer | null = null;

// Map userId -> Set of socketIds
const userSockets = new Map<string, Set<string>>();

export function initSocket(httpServer: HTTPServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      // Allow unauthenticated connections (read-only)
      next();
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as Socket & { userId?: string }).userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as Socket & { userId?: string }).userId;
    if (userId) {
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket.id);
      io!.emit("user_online", userId);
      logger.debug(`User ${userId} connected (socket ${socket.id})`);
    }

    socket.on("join_conversation", (conversationId: string) => {
      void socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId: string) => {
      void socket.leave(`conversation:${conversationId}`);
    });

    socket.on("disconnect", () => {
      if (userId) {
        userSockets.get(userId)?.delete(socket.id);
        if (userSockets.get(userId)?.size === 0) {
          userSockets.delete(userId);
          io!.emit("user_offline", userId);
        }
        logger.debug(`User ${userId} disconnected (socket ${socket.id})`);
      }
    });
  });

  return io;
}

export const socketService = {
  emitToUser<T>(userId: string, event: string, data: T): void {
    if (!io) return;
    const sockets = userSockets.get(userId);
    if (sockets) {
      for (const sid of sockets) {
        io.to(sid).emit(event, data);
      }
    }
  },

  broadcast<T>(event: string, data: T): void {
    if (!io) return;
    io.emit(event, data);
  },

  getOnlineUserIds(): string[] {
    return Array.from(userSockets.keys());
  },
};
