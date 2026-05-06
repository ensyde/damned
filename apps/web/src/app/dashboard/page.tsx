"use client";

import { useAuth } from "@/components/layout/AuthProvider";
import { apiGet } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Download, Bell, Users } from "lucide-react";
import { DiscordWidget } from "@/components/discord/DiscordWidget";

interface DashboardData {
  recentThreads: Array<{ id: string; title: string; slug: string; lastPostAt: string }>;
  recentDownloads: Array<{ id: string; title: string; slug: string }>;
  unreadMessages: number;
  unreadNotifications: number;
}

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    // Load dashboard data from multiple endpoints
    Promise.all([
      apiGet<{ notifications: []; unreadCount: number }>("/notifications?unreadOnly=true&perPage=1", accessToken),
    ]).then(([notifs]) => {
      setData({
        recentThreads: [],
        recentDownloads: [],
        unreadMessages: 0,
        unreadNotifications: notifs.unreadCount,
      });
    }).catch(() => undefined);
  }, [accessToken]);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted mb-4">Please log in to view your dashboard.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Welcome back, {user.displayName ?? user.username}!
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Bell size={20} />} label="Unread Notifications" value={data?.unreadNotifications ?? 0} href="/notifications" />
        <StatCard icon={<MessageSquare size={20} />} label="Unread Messages" value={data?.unreadMessages ?? 0} href="/messages" />
        <StatCard icon={<MessageSquare size={20} />} label="Posts" value={user.postCount ?? 0} href={`/profile/${user.username}`} />
        <StatCard icon={<Users size={20} />} label="Reputation" value={user.reputationPoints ?? 0} href={`/profile/${user.username}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Recent Discussions</h2>
            <p className="text-text-muted text-sm">
              <Link href="/forum" className="text-primary">Browse the forum →</Link>
            </p>
          </div>
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Recent Downloads</h2>
            <p className="text-text-muted text-sm">
              <Link href="/downloads" className="text-primary">Browse downloads →</Link>
            </p>
          </div>
        </div>
        <div>
          <DiscordWidget />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="card p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 text-primary rounded">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </div>
    </Link>
  );
}
