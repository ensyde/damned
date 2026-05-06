"use client";

import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/AuthProvider";
import { useSocket } from "@/components/layout/SocketProvider";
import { apiGet, apiPost } from "@/lib/api";
import { NotificationPublic } from "@damned/shared";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { accessToken } = useAuth();
  const socket = useSocket();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationPublic[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiGet<{ notifications: NotificationPublic[]; unreadCount: number }>(
      "/notifications?unreadOnly=true&perPage=10",
      accessToken
    )
      .then((d) => {
        setNotifications(d.notifications);
        setUnread(d.unreadCount);
      })
      .catch(() => undefined);
  }, [accessToken]);

  useEffect(() => {
    if (!socket) return;
    socket.on("notification", (n) => {
      setNotifications((prev) => [n, ...prev.slice(0, 9)]);
      setUnread((c) => c + 1);
    });
    return () => {
      socket.off("notification");
    };
  }, [socket]);

  const markAllRead = async () => {
    if (!accessToken) return;
    await apiPost("/notifications/mark-all-read", {}, accessToken).catch(() => undefined);
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative">
      <button
        className="btn-ghost p-2 relative"
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-surface border border-border rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="text-center text-text-muted py-6 text-sm">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-surface-2 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-xs text-text-muted mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-border">
            <Link
              href="/notifications"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
