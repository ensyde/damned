import { prisma } from "../config/prisma";
import { socketService } from "./socket";
import { emailService } from "./email";
import { NotificationType } from "@damned/db";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export const notificationService = {
  async create(params: CreateNotificationParams) {
    const { userId, type, title, body, link, metadata } = params;

    // Check user preferences
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });

    // Default: inApp=true, email=false
    const inApp = pref ? pref.inApp : true;
    const emailNotif = pref ? pref.email : false;

    if (!inApp) return;

    const notification = await prisma.notification.create({
      data: { userId, type, title, body, link, metadata },
    });

    // Real-time push
    socketService.emitToUser(userId, "notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      isRead: false,
      createdAt: notification.createdAt,
    });

    // Email digest (fire-and-forget)
    if (emailNotif) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true },
      });
      if (user) {
        emailService
          .sendNotificationDigest(user.email, user.username, [{ title, body, link }])
          .catch(() => undefined);
      }
    }

    return notification;
  },
};
