"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/components/layout/AuthProvider";
import { NotificationPublic } from "@damned/shared";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const { accessToken, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p: number) => {
    if (!accessToken) return;
    setLoading(true);
    apiGet<{ notifications: NotificationPublic[]; totalPages: number }>(`/notifications?page=${p}&perPage=20`, accessToken)
      .then((d) => {
        setNotifications(d.notifications);
        setTotalPages(d.totalPages);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => { void load(page); }, [page, accessToken]);

  const markAllRead = async () => {
    if (!accessToken) return;
    await apiPost("/notifications/mark-all-read", {}, accessToken);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read");
  };

  if (!user) return <div className="text-center py-20"><Link href="/login" className="btn-primary">Sign in</Link></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={() => void markAllRead()} className="btn-secondary text-sm">Mark all read</button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="card p-10 text-center text-text-muted">No notifications.</div>
      ) : (
        <div className="card divide-y divide-border">
          {notifications.map((n) => (
            <div key={n.id} className={`p-4 ${!n.isRead ? "bg-primary/5" : ""}`}>
              <div className="flex items-start gap-3">
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                <div className="flex-1">
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.body && <p className="text-text-muted text-sm mt-0.5">{n.body}</p>}
                  <p className="text-xs text-text-muted mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                  {n.link && <Link href={n.link} className="text-xs text-primary hover:underline mt-1 inline-block">View →</Link>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-text-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm">Next</button>
        </div>
      )}
    </div>
  );
}
